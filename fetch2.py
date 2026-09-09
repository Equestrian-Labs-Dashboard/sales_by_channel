import urllib.request
html = urllib.request.urlopen("https://equestrian-labs-dashboard.github.io/Hits-Hudson_Corro/").read().decode("utf-8")
with open("hits.html", "w", encoding="utf-8") as f:
    f.write(html)
