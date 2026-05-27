
#include <iostream>
#include <string>
#include <curl/curl.h>
#include <sstream> // Required for stringstream
#include <vector>   // Required for vector

size_t WriteCallback(void* contents, size_t size, size_t nmemb, void* userp)
{
    size_t total_Size = size * nmemb;
    std::string* output = static_cast<std::string*>(userp);
    output->append(static_cast<char*>(contents), total_Size);
    return total_Size;
}

// Function to fetch models from the API
std::string getModels(const std::string& url) {
    CURL* curl = curl_easy_init();
    if (!curl) {
        std::cerr << "Error initializing curl for getModels" << std::endl;
        return ""; // Return an empty string on error
    }

    std::string response;
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);

    CURLcode res = curl_easy_perform(curl);
    if (res != CURLE_OK) {
        std::cerr << "Error fetching models: " << curl_easy_strerror(res) << std::endl;
        curl_easy_cleanup(curl);
        return ""; // Return an empty string on error
    }

    curl_easy_cleanup(curl);
    return response;
}


int main()
{
    CURL* curl = curl_easy_init();
    if (!curl)
    {
        std::cerr << "Error initializing curl" << std::endl;
        return 1;
    }

    std::string url = "http://166.79.26.108:2048/semcat/get_answer";
    std::string models_url = "http://166.79.26.108:2048/semcat/get_models"; // URL for fetching models

    std::string mdl_name;
    std::string model_response = getModels(models_url);

    if (!model_response.empty()) {
      // Parse JSON response (very basic parsing - consider a full JSON library)
        size_t start = model_response.find("\"result\":[");
        if (start != std::string::npos) {
            size_t end = model_response.find("]", start);
            if (end != std::string::npos) {
                std::string result_string = model_response.substr(start + strlen("\"result\":["), end - (start + strlen("\"result\":[")));
                // Simple splitting (assuming comma separated values)
                std::stringstream ss(result_string);
                std::string model;
                while (std::getline(ss, model, ',')) {
                    // Remove quotes
                    size_t quote_start = model.find('"');
                    if (quote_start != std::string::npos) {
                        model = model.substr(quote_start + 1, model.length() - quote_start - 2);
                    }
                    mdl_name = model; // Take the first model
                    break; // Stop after getting the first model
                }
            }
        } else {
          std::cerr << "Could not find '\"result\":[' in the response." << std::endl;
          mdl_name = "Professional"; //default value
        }
    } else {
        std::cerr << "Failed to retrieve models. Using default model." << std::endl;
        mdl_name = "Professional"; // Default model name if API call fails
    }



    std::string payload = R"({
    "messages" : [{"role": "user","content":"Hi"},
         {"role": "assistant","content":"Hello! How can I assist you today?"},
         {"role": "user","content":"Write a code to calculate simple interest in python"}],
    "mdl_name" : ")" + mdl_name + R"(",
    "max_tokens" : "4096",
    "temperature" : "0.8"
    })";

    std::string response;

    struct curl_slist *headers = nullptr;

    std::string api_key = "gAAAAA........................................................................";

    headers = curl_slist_append(headers, ("Authorization: Bearer " +api_key).c_str());
    headers = curl_slist_append(headers, "Content-Type: application/json"); // Optional: Set JSON content type



    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POST, 1L);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, payload.c_str());
    curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, payload.size());

    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);

    CURLcode res = curl_easy_perform(curl);
    if (res != CURLE_OK)
    {
        std::cerr << "Error sending request: " << curl_easy_strerror(res) << std::endl;
        return 1;
    }

    std::cout << response << std::endl;

    curl_easy_cleanup(curl);

    return 0;
}


