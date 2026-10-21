"""Strict static SVG subset: no scripts, CSS, links, images or external resources."""
import re
import xml.etree.ElementTree as ET

NS = 'http://www.w3.org/2000/svg'
TAGS = set('svg g defs title desc rect circle ellipse line polyline polygon path text tspan linearGradient radialGradient stop clipPath'.split())
ATTRS = set('id viewBox width height x y x1 x2 y1 y2 cx cy r rx ry d points fill fill-opacity stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stroke-dasharray opacity transform gradientTransform gradientUnits offset stop-color stop-opacity font-size font-family font-weight text-anchor dominant-baseline dx dy clip-path fill-rule clip-rule spreadMethod fx fy'.split())
ET.register_namespace('', NS)

def sanitize_svg(raw: str) -> str:
    if len(raw) > 200_000 or '<!DOCTYPE' in raw.upper() or '<!ENTITY' in raw.upper():
        raise ValueError('SVG is too large or contains forbidden XML declarations.')
    # Input is Unicode text; reject DTD/entity declarations before XML parsing.
    # Without a DTD, ElementTree cannot resolve custom or external entities.
    root = ET.fromstring(raw)
    if root.tag not in ('svg', f'{{{NS}}}svg'):
        raise ValueError('Expected an SVG root element.')
    nodes = list(root.iter())
    if len(nodes) > 2500:
        raise ValueError('SVG contains too many elements.')
    for node in nodes:
        tag = node.tag.removeprefix(f'{{{NS}}}')
        if tag not in TAGS:
            raise ValueError(f'Unsupported SVG element: {tag}')
        node.tag = f'{{{NS}}}{tag}'
        for name, value in list(node.attrib.items()):
            if name not in ATTRS:
                del node.attrib[name]
                continue
            if len(value) > 40_000 or re.search(r'[<>\\]|(?:https?:|data:|javascript:|file:|@import|expression)', value, re.I):
                raise ValueError('Unsafe SVG attribute.')
            if 'url' in value.lower() and not re.fullmatch(r'url\(#[A-Za-z_][\w.-]*\)', value):
                raise ValueError('Only local SVG references are allowed.')
    viewbox = root.get('viewBox', '0 0 1024 1024')
    parts = re.split(r'[\s,]+', viewbox.strip())
    if len(parts) != 4:
        raise ValueError('Invalid SVG viewBox.')
    import math
    numbers = [float(p) for p in parts]
    if not all(math.isfinite(n) for n in numbers) or not all(0 < n <= 4096 for n in numbers[2:]):
        raise ValueError('Invalid SVG dimensions.')
    root.set('viewBox', viewbox)
    root.set('width', str(numbers[2]))
    root.set('height', str(numbers[3]))
    return ET.tostring(root, encoding='unicode')
