/* Comunicação com o PHP (api/import.php) */
(function () {
    const ENDPOINT = "./api/import.php";
    const ALLOWED = ["litematic", "schem", "schematic", "nbt", "json"];

    function extension(name) {
        const m = /\.([a-z0-9]+)$/i.exec(name || "");
        return m ? m[1].toLowerCase() : "";
    }

    /**
     * Envia o arquivo e devolve o projeto processado.
     * onPhase("upload", pct) durante o envio, onPhase("processing") depois.
     */
    function importFile(file, onPhase) {
        const err = (code, params) => Object.assign(new Error(SC.i18n.error(code, params)), { code, params });
        return new Promise((resolve, reject) => {
            if (!ALLOWED.includes(extension(file.name))) {
                reject(err("ext_unsupported"));
                return;
            }

            const form = new FormData();
            form.append("file", file, file.name);

            const xhr = new XMLHttpRequest();
            xhr.open("POST", ENDPOINT);
            xhr.responseType = "json";
            xhr.timeout = 240000;

            xhr.upload.onprogress = e => {
                if (e.lengthComputable && onPhase) onPhase("upload", Math.round(e.loaded / e.total * 100));
            };
            xhr.upload.onload = () => onPhase && onPhase("processing");

            xhr.onload = () => {
                const body = xhr.response;
                if (body && body.ok && body.project) return resolve(body.project);
                if (body && body.code) return reject(err(body.code, body.params));
                if (xhr.status === 413) return reject(err("server_limit"));
                reject(err("http_status", { status: xhr.status }));
            };
            xhr.onerror = () => reject(err("network"));
            xhr.ontimeout = () => reject(err("timeout"));

            xhr.send(form);
        });
    }

    SC.api = { importFile, extension };
})();
