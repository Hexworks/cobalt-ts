import fetch from "cross-fetch";

export type RequestParams = {
    method: string;
};

export type HttpAdapter<I extends string, P extends RequestParams> = {
    fetch(input: I, init?: RequestInit): Promise<Response>;
};

const x = fetch("https://www.google.com", {});
