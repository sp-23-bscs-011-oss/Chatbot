import json

import httpx
import pytest
from fastapi.testclient import TestClient

from backend import main


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(main.settings, 'azure_openai_api_key', 'test-key')
    monkeypatch.setattr(main.settings, 'azure_openai_endpoint', 'https://example.services.ai.azure.com/openai/v1/responses')
    with TestClient(main.app) as client:
        yield client


@pytest.mark.parametrize('path,v1', [('', False), ('/openai', False), ('/openai/v1/', True), ('/openai/v1/responses', True), ('/openai/v1/chat/completions', True)])
def test_endpoint_formats(monkeypatch, path, v1):
    monkeypatch.setattr(main.settings, 'azure_openai_endpoint', ' https://example.services.ai.azure.com' + path + ' ')
    url, params, model = main.azure_request_config()
    assert url == ('https://example.services.ai.azure.com/openai/v1/chat/completions' if v1 else 'https://example.services.ai.azure.com/openai/deployments/gpt-4o/chat/completions')
    assert params == ({} if v1 else {'api-version': main.settings.azure_openai_api_version})
    assert model == ({'model': 'gpt-4o'} if v1 else {})


def mock_azure(monkeypatch, handler):
    original = main.app.state.http
    main.app.state.http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    # Close the replacement on the application's event loop before lifespan ends.
    return original


def test_health_and_docs(client):
    assert client.get('/api/health').json() == {'status': 'ok', 'configured': True}
    assert client.get('/docs').status_code == 200


def test_chat_and_image(client, monkeypatch):
    def handler(request):
        assert request.url.path == '/openai/v1/chat/completions'
        assert not request.url.query
        body = json.loads(request.content)
        assert body['model'] == 'gpt-4o'
        assert request.headers['api-key'] == 'test-key'
        content = json.dumps({'title': 'Fox', 'description': 'An orange fox.', 'svg': '<svg viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="orange"/></svg>'}) if 'response_format' in body else 'Hello!'
        return httpx.Response(200, json={'choices': [{'finish_reason': 'stop', 'message': {'content': content}}]})

    original = mock_azure(monkeypatch, handler)
    try:
        assert client.post('/api/chat', json={'messages': [{'role': 'user', 'content': 'Hello'}]}).json() == {'content': 'Hello!'}
        response = client.post('/api/images', json={'prompt': 'An orange fox'})
        assert response.status_code == 200
        assert response.json()['title'] == 'Fox'
        assert 'http://www.w3.org/2000/svg' in response.json()['svg']
    finally:
        client.portal.call(main.app.state.http.aclose)
        main.app.state.http = original


@pytest.mark.parametrize('status,expected', [(401, 502), (404, 502), (429, 429)])
def test_upstream_errors(client, monkeypatch, status, expected):
    original = mock_azure(monkeypatch, lambda request: httpx.Response(status))
    try:
        response = client.post('/api/chat', json={'messages': [{'role': 'user', 'content': 'Hello'}]})
        assert response.status_code == expected
        assert response.json()['detail']
    finally:
        client.portal.call(main.app.state.http.aclose)
        main.app.state.http = original


def test_missing_credentials_and_validation(client, monkeypatch):
    monkeypatch.setattr(main.settings, 'azure_openai_api_key', '')
    assert client.post('/api/chat', json={'messages': [{'role': 'user', 'content': 'Hello'}]}).status_code == 503
    assert client.post('/api/chat', json={'messages': [{'role': 'assistant', 'content': 'Hello'}]}).status_code == 422
    assert client.post('/api/images', json={'prompt': 'x'}).status_code == 422


@pytest.mark.skipif(not (main.FRONTEND_DIST / 'index.html').is_file(), reason='frontend not built')
def test_frontend_served_without_shadowing_api(client):
    for path in ('/', '/images'):
        response = client.get(path)
        assert response.status_code == 200 and '<div id="root">' in response.text
    asset = next((main.FRONTEND_DIST / 'assets').iterdir()).name
    assert client.get(f'/assets/{asset}').status_code == 200
    assert client.get('/api/health').json()['status'] == 'ok'
    assert client.get('/api/missing').status_code == 404
    assert client.get('/openapi.json').json()['info']['title'] == 'Forma AI'
    assert client.get('/docs').status_code == 200
    assert client.get('/..%2Fbackend%2F.env').text.startswith('<!doctype html>')
