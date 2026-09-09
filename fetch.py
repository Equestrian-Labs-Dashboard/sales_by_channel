import urllib.request
import re
html = urllib.request.urlopen("https://equestrian-labs-dashboard.github.io/Hits-Hudson_Corro/").read().decode("utf-8")
for match in re.findall(r'src="(.*?)"', html):
    print(match)
