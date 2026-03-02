"""
MkDocs hook: Jinja2 커스텀 필터 등록.
BreadcrumbList JSON-LD에서 URL 인코딩된 한글 경로를 디코딩하기 위해 사용한다.
"""
from urllib.parse import unquote


def on_env(env, config, files):
    env.filters["urldecode"] = lambda s: unquote(s)
    return env
