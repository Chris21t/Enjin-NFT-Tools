import os, re
 
with os.scandir('json') as directory:
    for item in directory:
        if not item.name.startswith('.') and item.is_file():
            with open(item, mode="r+") as file:
                file_text = file.read()
                regex = re.compile('https://nftstorage.link/ipfs/bafybeihxqkih2kxscy47m3ncxj244qf6bpxijzbzd3vnlxsp2hv6oa3kli')
                file_text = regex.sub('https://nftstorage.link/ipfs/bafybeidecivwnewezc6xk7zmkci54y3haekiwg6lmaaa6b4l4t37ewsu', file_text)
                file.seek(0)
                file.write(file_text)