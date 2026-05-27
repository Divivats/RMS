
/**
 * Enums
 */
export enum Role {
    User = 'user',
    Assistant = 'assistant',
}

/**
 * Message payload used by the API
 */
export interface Message {
    role: Role;
    content: string;
}

/**
 * Standardised API response wrapper
 */
export interface ApiResponse<T> {
    type: 'success' | 'error';
    body: T | string;
}

/**
 * Expected shape of the models endpoint
 */
export interface ModelList {
    /** List of model names */
    models: string[];
    /** Optional metadata (if the API ever expands) */
    [key: string]: unknown;
}

/**
 * Configuration for the client
 */
export interface SemcatClientConfig {
    /** Base URL â€“ e.g. https://api.example.com */
    baseUrl?: string;
    /** Default timeout (ms) â€“ optional */
    timeoutMs?: number;
}

/**
 * Core client for interacting with the SEMCAT API
 */
export class SemcatApiClient {
    private readonly baseUrl: string;

    /**
     * @param config Optional configuration.  Falls back to `process.env.SEMCAT_BASE_URL` or a hardâ€‘coded demo value.
     * @param fetchFn Optional fetch implementation (useful for Node or tests).
     */
    constructor(
        private readonly config: SemcatClientConfig = {},
        private readonly fetchFn: typeof fetch = fetch
    ) {
        this.baseUrl =
            config.baseUrl ?? process.env.SEMCAT_BASE_URL ?? 'http://166.79.26.108:2048';
    }

    /* --------------------------------------------------------------------- */
    /* Private helpers                                                      */
    /* --------------------------------------------------------------------- */

    /**
     * Build common headers for all requests.
     */
    private _headers(apiKey: string): HeadersInit {
        return {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
        };
    }

    /* --------------------------------------------------------------------- */
    /* Public API                                                            */
    /* --------------------------------------------------------------------- */

    /**
     * Send a streaming request to the assistant tool.
     *
     * @throws Error if the network or API returns a nonâ€‘200 status.
     */
    async fetchAssistantToolApiResponse(
        messages: Message[],
        maxTokens: number,
        temperature: number,
        modelName: string,
        apiKey: string
    ): Promise<ApiResponse<Response>> {
        const url = `${this.baseUrl}/semcat/get_answer`;

        const body = JSON.stringify({
            messages,
            max_tokens: maxTokens,
            temperature,
            model_name: modelName,
        });

        const res = await this.fetchFn(url, {
            method: 'POST',
            headers: this._headers(apiKey),
            body,
        });

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`API error ${res.status}: ${txt}`);
        }

        return { type: 'success', body: res };
    }

    /**
     * Helper that consumes the stream returned by the assistant tool.
     */
    async readStreamData(
        response: Response,
        onChunk: (chunk: string) => void
    ): Promise<void> {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let done = false;

        while (!done) {
            const { value, done: streamDone } = await reader.read();
            if (streamDone || !value) {
                done = true;
                break;
            }
            const chunk = decoder.decode(value, { stream: true });
            onChunk(chunk);
        }
        onChunk('\n[STREAM END]');
    }

    /**
     * Convenience wrapper that asks the assistant and streams the answer.
     *
     * @param apiKey   Your bearer token.
     * @param options  Optional arguments such as the model name.
     */
    async askAssistantTool(
        apiKey: string,
        options?: {
            /** Example: 'SEM_GO20' */
            modelName?: string;
            /** Example: 4096 */
            maxTokens?: number;
            /** Example: 0.8 */
            temperature?: number;
            /** Initial conversation */
            initialMessages?: Message[];
        }
    ): Promise<void> {
        const {
            modelName = 'SEM_GO20',
            maxTokens = 4096,
            temperature = 0.8,
            initialMessages = [
                { role: Role.User, content: 'Hi' },
                { role: Role.Assistant, content: 'Hello! How can I help you today?' },
                { role: Role.User, content: 'Write a code to calculate simple interest in python' },
            ],
        } = options ?? {};

        const res: any = await this.fetchAssistantToolApiResponse(
            initialMessages,
            maxTokens,
            temperature,
            modelName,
            apiKey
        );

        if (res.type !== 'success') {
            throw new Error(`Unexpected response type: ${res.type}`);
        }

        await this.readStreamData(res.body, (chunk) => console.log(chunk));
    }

    /**
     * Retrieve the list of available models.
     */
    async getModels(apiKey: string): Promise<ModelList | null> {
        const url = `${this.baseUrl}/semcat/get_models`;

        try {
            const res = await this.fetchFn(url, {
                method: 'GET',
                headers: this._headers(apiKey),
            });

            if (!res.ok) {
                const txt = await res.text();
                console.error(`GET ${url} failed (${res.status}): ${txt}`);
                return null;
            }

            const json = (await res.json()) as ModelList;
            return json;
        } catch (err) {
            console.error(`Error while fetching models from ${url}`, err);
            return null;
        }
    }

    /**
     * Simple wrapper that logs the fetched models.
     */
    async logModels(apiKey: string): Promise<void> {
        const models = await this.getModels(apiKey);
        if (!models) {
            console.warn('Could not load models.');
            return;
        }
        console.log('Fetched models:', models);
    }
}






// Usage example
const client = new SemcatApiClient({ baseUrl: 'http://166.79.26.108:2048' });

(async () => {
    const apiKey = 'YOUR_API_KEY';

    // 1ï¸âƒ£ Fetch and log the models
    await client.logModels(apiKey);

    // 2ï¸âƒ£ Ask the assistant tool
    await client.askAssistantTool(apiKey, {
        modelName: 'SEM_GO20',
        initialMessages: [
            { role: Role.User, content: 'Hi' },
            { role: Role.Assistant, content: 'Hello! How can I assist you today?' },
            { role: Role.User, content: 'Explain recursion in JavaScript.' },
        ],
    });
})();


