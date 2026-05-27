
/**
     * Generate API Key.
     * @param prompt is the Prompt.
     * @param max_tokens is the Max Token.
     * @param temperature is the Temperature.
     * @param model is the model.
     * @param apiKey is the API Key.
     * @returns generates the query response.
     */
async function fetchAssistantToolApiResponse(messages, max_tokens, temperature, mdl_name, apiKey) {
    try {
        const url = `http://166.79.26.108:2048/semcat/get_answer`;
        const headers = {
            'Accept': 'text/event-stream',
            'Content-Type': 'application/json',
            authorization: `Bearer ${apiKey}`
        };

        const body = JSON.stringify({
            messages,
            max_tokens,
            temperature,
            mdl_name
        });
        // Sending the POST request with fetch to initiate the stream
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: body
        })
        if (!response.ok) {
            return { type: "error", body: 'Error: An error occurred' };
        }
        return { type: "success", body: response.body };
    } catch (error) {
        if (error instanceof Error) {
            return { type: "error", body: `Error: ${error.message}` };
        } else {
            return { type: "error", body: 'Error: An unexpected error occurred' };
        }
    }
}



/**
* Asks the SEMCAT AI assistant tool.
* 
* @async
*/
async function askAssistantTool() {
    // Query to be sent to the AI assistant tool
    const messages = [{ "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello! How can I assist you today?" },
    { "role": "user", "content": "Write a code to calculate simple interest in python" }];

    // Maximum number of tokens in the response
    const maxToken = '4096';

    // Temperature parameter for the AI model
    const temperature = '0.8';

    // Name of the AI model to use
    const model_name = 'SEM_G020';

    // API key for authentication (empty string by default)
    // Get API key from semcat web portal
    const apiKey = 'YOUR_API_KEY';

    try {
        // Send the query to the AI assistant tool and get the response
        let assistantToolResponse = await fetchAssistantToolApiResponse(messages, maxToken, temperature, model_name, apiKey);

        if (assistantToolResponse.type === "success") {
            // Get the reader and decoder for the response stream
            const reader = assistantToolResponse?.body.getReader();
            const decoder = new TextDecoder();

            // Read the stream data and process it
            readStreamData(decoder, reader);
        } else {
            // If the response is not successful, stop the running process and show an error message
            console.error(assistantToolResponse?.body);
        }
    } catch (error) {
        // Handle any errors that occur during the process
        console.error(error);
    }
}


/**
* Recursively reads the stream data from the SEMCAT AI assistant tool's response,
* decodes the chunks, and logs them to the console.
* 
* @param {TextDecoder} decoder - The TextDecoder object used to decode the stream data.
* @param {ReadableStreamDefaultReader} reader - The ReadableStreamDefaultReader object used to read the stream data.
* @param {string} query - The original query sent to the AI assistant tool (not used in this method).
*/
function readStreamData(decoder, reader) {
    // Read the next chunk from the stream
    reader.read().then((res) => {
        // Check if the streaming response is completed
        if (res.done) {
            console.log("Streaming response completed");
            return;
        }

        // Decode the current chunk
        const chunk = decoder.decode(res.value, { stream: true });

        // Log the received chunk to the console
        console.log("Received Chunk", chunk);

        // Recursively call this method to read the next chunk
        readStreamData(decoder, reader);
    });
}


/**
 * Fetch the list of available models from the API.
 *
 * @returns {Promise<any|null>} A promise that resolves to the JSON
 *                              payload on success, or `null` if anything fails.
 */
function getModels(apiKey) {
    const url = `http://166.79.26.108:2048/semcat/get_models`;   // same base as before

    // --- 1ï¸âƒ£ Make the request ---------------------------------------------
    return fetch(url, {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            authorization: `Bearer ${apiKey}`
        },
    })
        .then((response) => {
            // Treat any nonâ€‘2xx status as an error
            if (!response.ok) {
                // Grab the response body for debugging
                return response.text().then((text) => {
                    console.error(`GET ${url} failed: ${response.status} ${response.statusText}\n${text}`);
                    return null;           // signal failure
                });
            }
            // 2xx OK â€“ parse JSON
            return response.json();     // will resolve to the actual data
        })
        .catch((err) => {
            // Network error, CORS issue, JSON parsing error, etc.
            console.error(`Network or parsing error while fetching ${url}:`, err);
            return null;
        });
}


/**
 * Wrapper that calls {@link getModels} and logs the result.
 *
 * @returns {Promise<void>} Resolves when logging is finished.
 */
async function logModels() {
    try {
        const apiKey = 'YOUR_API_KEY';
        const models = await getModels(apiKey);

        if (!models) {
            console.warn('Could not load models.');
        } else {
            console.log('Fetched models:', models);
        }
    } catch (err) {
        /* The getModels() implementation already resolves with `null`
           on failure, so this catch block is rarely hit. It only fires
           for unexpected runtime errors (e.g., reference errors). */
        console.error('Unexpected error while fetching models:', err);
    }
}



// Usage example
// 1ï¸âƒ£ Fetch and log the models
logModels();

// 2ï¸âƒ£ Ask the assistant tool
askAssistantTool();


