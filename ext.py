from bs4 import BeautifulSoup
with open('hits.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')
for i, s in enumerate(soup.find_all('script')):
    if s.string:
        with open('script_' + str(i) + '.js', 'w', encoding='utf-8') as out:
            out.write(s.string)
