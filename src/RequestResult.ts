import Client from './Client';

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export default class RequestResult {
    constructor(
        public client: Client,
        public method: HTTPMethod,
        public path: string,
        public query: string,
        public requestRaw: { [key: string]: any },
        public requestContent: { [key: string]: any },
        public responseRaw: { [key: string]: any },
        public responseContent: { [key: string]: any },
        public statusCode: number,
        public responseHeaders: { [key: string]: any },
        public startTime: number,
        public endTime: number,
    ) {}
    get auth() {
        return this.client._secret;
    }
    get timeTaken() {
        return this.endTime - this.startTime;
    }
}
