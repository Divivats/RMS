
using System;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json; // For JSON serializing
using System.Collections.Generic;
using Newtonsoft.Json.Linq;



namespace HttpStreamingExample
{
    /// <summary>
    /// This class represents the main program for HTTP streaming example.
    /// It provides functionality to send a prompt to the SEMCAT API and receive a response.
    /// </summary>
    /// 


    class Program
    {
        // Default model name used for the API request
        

        // Default maximum number of tokens to generate in the response
        private const int DefaultMaxTokens = 4096;

        // Default temperature value for the response generation
        private const double DefaultTemperature = 0.8;

        // API key for authentication (replace with your actual API key)
        private const string api_key = "gAAA............................................................"; // enter your API key get it by logging to SEMCAT web portal

        // Base URL for the SEMCAT API
        private const string url = "http://166.79.26.108:2048/semcat";

        /// <summary>
        /// Main entry point of the program.
        /// </summary>
        /// <param name="args">Command line arguments (not used).</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        public static async Task Main(string[] args)
        {
            // Example usage: sending a list of messages to the API
            List<Dictionary<string, string>> messages = new List<Dictionary<string, string>>
            {
                new Dictionary<string, string> { {"role", "user"}, {"content", "Hi"} },
                new Dictionary<string, string> { {"role", "assistant"}, {"content", "Hello! How can I assist you today?"} },
                new Dictionary<string, string> { {"role", "user"}, {"content", "Write a code to calculate simple interest in python"} }
            };
            string DefaultModelName = "Professional";
            DefaultModelName = await GetModelsAsync();

            await stream(messages, DefaultModelName, DefaultMaxTokens, DefaultTemperature);
        }

        public static async Task<string> GetModelsAsync()
        {
            using (HttpClient client = new HttpClient())
            {
                try
                {
                    HttpResponseMessage response = await client.GetAsync($"{url}/get_models");
                    response.EnsureSuccessStatusCode(); // Throw exception if not successful

                    string jsonString = await response.Content.ReadAsStringAsync();
                    JObject json = JObject.Parse(jsonString);

                    if (json["result"] != null && json["result"].HasValues)
                    {
                        return json["result"][0].ToString(); // Or Index 1 etc
                    }
                    else
                    {
                        return null;
                    }
                }
                catch (HttpRequestException e)
                {
                    Console.WriteLine($"Error getting models: {e.Message}");
                    return null;
                }
            }
        }

        /// <summary>
        /// Sends a list of messages to the SEMCAT API and prints the response.
        /// </summary>
        /// <param name="prompt">List of messages to send to the API.</param>
        /// <param name="model_name">Name of the model to use for response generation.</param>
        /// <param name="max_tokens">Maximum number of tokens to generate in the response.</param>
        /// <param name="temperature">Temperature value for response generation.</param>
        /// <returns>A task that represents the asynchronous operation.</returns>
        static async Task stream(List<Dictionary<string, string>> prompt, string model_name, int max_tokens, double temperature)
        {
            // Create a new instance of HttpClient
            using (HttpClient client = new HttpClient())
            {
                // Create a payload object with the required properties
                var payload = new
                {
                    messages = prompt,
                    mdl_name = model_name,
                    max_tokens = max_tokens,
                    temperature = temperature
                };

                // Serialize the payload to JSON
                string jsonPayload = JsonConvert.SerializeObject(payload);

                // Create a StringContent object with the JSON payload
                StringContent content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                // Create a new HttpRequestMessage with the POST method and URL
                HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, $"{url}/get_answer")
                {
                    Content = content,
                };

                // Add the API key to the Authorization header
                request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", api_key);

                // Send the request and read the response
                using (var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead))
                {
                    // Check if the response was successful
                    response.EnsureSuccessStatusCode();

                    // Read the response content as a stream
                    using (StreamReader stream = new StreamReader(await response.Content.ReadAsStreamAsync()))
                    {
                        // Read the stream in chunks of 1KB
                        char[] buffer = new char[1024];
                        int bytesRead;
                        while ((bytesRead = await stream.ReadAsync(buffer, 0, buffer.Length)) > 0)
                        {
                            // Convert the chunk to a string and print it
                            string chunk = new string(buffer, 0, bytesRead);
                            for (int i = 0; i < chunk.Length; i++)
                            {
                                Console.Write(chunk[i]);
                            }
                        }
                    }
                }
            }
        }
    }
}


