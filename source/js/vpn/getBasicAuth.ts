export const getBasicAuth = (username: string, password: string) => 'Basic ' + btoa(username + ':' + password);
