
# Super Sender

Super Sender is a command-line tool built with the Polkadot API to facilitate the sending of tokens to multiple recipients. This tool supports sending tokens on multiple networks such as `efinity` and `canary`.

## Features:
- Interactive CLI interface.
- Logging of transactions with timestamps.
- Option to send tokens to a single recipient or to multiple recipients from a file.
- Network selection between `enjin` and `canary`.

## Prerequisites:
1. Node.js installed.
2. Required npm packages: 
    - `@polkadot/api`
    - `inquirer`
    - `winston`
    - `chalk`

## How to Use:

1. Clone the repository or download the `super_sender.js` file.
2. Install required npm packages:
    ```
    npm install @polkadot/api inquirer winston chalk
    ```
3. Ensure the `SEED_PHRASE` inside the script is replaced with your actual seed phrase.
4. If using the 'multiple' recipient mode, ensure there's a `recipients.txt` file in the same directory with one address per line.
5. Run the script:
    ```
    node super_sender.js
    ```
6. Follow the on-screen prompts to select the network, input collection ID, tokenId, and choose the recipient mode.
7. If you choose 'multiple' recipients, the script will chronologically send tokens to the addresses listed in the `recipients.txt` file.

## Logs:
- All transactions and errors are logged with timestamps.
- Logs are saved to `transaction.log`.

## Important Note:
- Ensure your seed phrase is kept confidential. Do not expose it in a public or shared environment.
- Always test your transactions on a test network before moving to a main network.

## Contributing:
Feel free to fork the repository and submit pull requests for any enhancements or fixes.

## License:
This project is licensed under the MIT License.

