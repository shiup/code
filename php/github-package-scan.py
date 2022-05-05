#
# export GITHUB_TOKEN="xxxx"
# https://docs.github.com/en/rest
#
# pip install PyGithub requests

import os

hostname = 'https://github.hal.com/api/v3'
token = os.getenv('GITHUB_TOKEN', '...')
import requests
import base64
import json
import sys
from pprint import pprint

token = os.getenv('GITHUB_TOKEN', '...')
headers = {'Authorization': f'token {token}',
           'Accept' : 'application/vnd.github.v3+json'}

# from https://github.hal.com/spoon/spoon/issues/6840
if len(sys.argv) != 2:
  print('Missing the package to look for')
  quit()

def search_package(repos):
  for repo in repos:
    query_url = f"https://api.github.hal.com/repos/" + repo + "/contents/package.json"
    params = {}
    r = requests.get(query_url, headers=headers, params=params)
    if r.ok:
      # jsoncontent = json.loads(base64.b64decode(r.json()['content']).decode('utf-8'))['dependencies']
      # content = json.dumps(jsoncontent)
      content = base64.b64decode(r.json()['content']).decode('utf-8')
      if sys.argv[1] in content:
        print('[package.json] found: ' + repo)

    query_url = f"https://api.github.hal.com/repos/" + repo + "/contents/package-lock.json"
    params = {}
    r = requests.get(query_url, headers=headers, params=params)
    if r.ok:
      # jsoncontent = json.loads(base64.b64decode(r.json()['content']).decode('utf-8'))['dependencies']
      # content = json.dumps(jsoncontent)
      content = base64.b64decode(r.json()['content']).decode('utf-8')
      if sys.argv[1] in content:
        print('[package-lock.json] found: ' + repo)



print('Package: ' +  sys.argv[1])

print('\nmigrate:')
repos = [ 'spoon/migration' ]
search_package(repos)

print('\nAPI')
repos = [ 'shiup/abc', 'spoon/test' ]
search_package(repos)
