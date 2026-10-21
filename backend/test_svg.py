import pytest
from backend.svg import sanitize_svg


def test_valid_gradient():
    assert 'url(#sky)' in sanitize_svg('<svg viewBox="0 0 100 100"><defs><linearGradient id="sky"><stop offset="0" stop-color="red"/></linearGradient></defs><rect width="100" height="100" fill="url(#sky)"/></svg>')


@pytest.mark.parametrize('content', [
    '<svg><script>alert(1)</script></svg>',
    '<svg><foreignObject/></svg>',
    '<svg><image href="https://evil.test/a"/></svg>',
    '<svg><rect fill="url(https://evil.test)"/></svg>',
    '<!DOCTYPE svg [<!ENTITY x "bad">]><svg>&x;</svg>',
    '<svg viewBox="0 0 NaN 12"/>',
    '<svg viewBox="0 0 999999 12"/>',
])
def test_unsafe_svg(content):
    with pytest.raises(Exception):
        sanitize_svg(content)


def test_event_and_style_removed():
    result = sanitize_svg('<svg onload="alert(1)"><rect style="fill:red" onclick="evil()"/></svg>')
    assert 'onload' not in result and 'onclick' not in result and 'style' not in result


@pytest.mark.parametrize('content', [
    '<!DOCTYPE svg SYSTEM "file:///private"><svg/>',
    '<!DOCTYPE svg [<!ENTITY x SYSTEM "https://evil.test">]><svg>&x;</svg>',
    '<svg>&undeclared;</svg>',
])
def test_xml_entities_rejected(content):
    with pytest.raises(Exception):
        sanitize_svg(content)
