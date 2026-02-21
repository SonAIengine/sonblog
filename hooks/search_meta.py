"""
MkDocs hook: frontmatter의 description을 검색 인덱스에 포함시킨다.
MkDocs search plugin은 렌더링된 HTML에서 텍스트를 추출하므로,
description을 숨겨진 요소로 페이지 콘텐츠 앞에 삽입한다.
"""


def on_page_content(html, page, config, files):
    desc = page.meta.get("description", "")
    if not desc:
        return html
    # hidden 속성: 브라우저에 렌더링되지 않지만 search plugin이 텍스트를 추출함
    return f'<p hidden class="search-meta">{desc}</p>\n{html}'
