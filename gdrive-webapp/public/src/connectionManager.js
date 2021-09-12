export default class ConnectionManager {
    constructor({ apiUrl }) {
        this.apiUrl = apiUrl;
        
        this.ioClient = io.connect(apiUrl, { withCredentials: false });
        this.sockedId = '';
    }

    configureEvents({ onProgress }) {
        this.ioClient.on('connect', this.onConnect.bind(this))
        this.ioClient.on('file-upload', onProgress)
    }

    onConnect(msg) {
        console.log('connected', this.ioClient.id);

        this.socketId = this.ioClient.id
    }

    async uploadFile(file) {
        const formData = new FormData();

        formData.append('files', file);

        const response = await fetch(`${this.apiUrl}?socketId=${this.sockedId}`, {
            method: 'POST',
            body: formData
        });

        return response.json();
    }

    async currentFiles() {
        const files = (await (await fetch(this.apiUrl)).json());

        return files;
    }
}