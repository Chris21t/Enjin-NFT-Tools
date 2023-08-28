import json
import os

# Get the directory path of the current script
script_dir = os.path.dirname(os.path.abspath(__file__))

# Construct the input and output file paths
input_file = os.path.join(script_dir, "input.txt")
output_file = os.path.join(script_dir, "output.txt")

with open(input_file, "r") as file:
    content = file.read()

data = json.loads(content)
urls = [edge["node"]["qr"]["url"] for edge in data["data"]["GetSingleUseCodes"]["edges"]]

with open(output_file, "w") as file:
    file.write("\n".join(urls))