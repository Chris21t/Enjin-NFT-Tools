import requests
import os

# Get the directory path of the current script
script_dir = os.path.dirname(os.path.abspath(__file__))

# Construct the output file path
output_file = os.path.join(script_dir, "output.txt")

# Construct the download folder path
download_folder = os.path.join(script_dir, "Download")

# Create the download folder if it doesn't exist
os.makedirs(download_folder, exist_ok=True)

with open(output_file, "r") as file:
    urls = file.read().splitlines()

# Determine the starting point and direction
starting_point = int(input("Enter the starting point: "))
direction = input("Enter the direction (up or down): ")

# Check the direction and set the step value accordingly
step = 1 if direction.lower() == "up" else -1

# Adjust the starting point based on the direction
starting_point_adjusted = starting_point
if direction.lower() == "down":
    starting_point_adjusted = starting_point + (len(urls) - 1) * step

for i, url in enumerate(urls, start=starting_point_adjusted):
    if "https://chart.googleapis.com/chart?cht=qr&chs=512x512&chl=" in url:
        # Calculate the index based on the direction
        index = starting_point_adjusted + (i - starting_point) * step

        # Construct the filename based on the direction
        filename = f"{index}.png"

        # Construct the local file path
        file_path = os.path.join(download_folder, filename)

        # Send a GET request to download the file
        response = requests.get(url)

        # Save the file to the download folder
        with open(file_path, "wb") as f:
            f.write(response.content)

        print(f"Downloaded: {file_path}")