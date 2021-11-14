const path = require("path");
const url = require("url");
const fs = require("fs");
const http = require("http");
const mime = require("mime");
const md5 = require("md5");
const { networkInterfaces } = require("os");

const staticPath = process.argv[2];

const server = http.createServer(async (req, res) => {
    var urlObj = url.parse(req.url);
    var urlPathname = urlObj.pathname;
    var filePathname = path.join(staticPath, urlPathname);
    filePathname = decodeURIComponent(filePathname);
    // 解析后对象的 ext 属性中保存着目标文件的后缀名
    var ext = path.parse(urlPathname).ext;
    // 获取后缀对应的 MIME 类型
    var mimeType = mime.getType(ext);
    const readFileResponse = await readFile(filePathname);
    if (readFileResponse.isSuc) {
        console.log("it is file");
        const fileMd5 = md5(readFileResponse.data); // 文件的 md5 值
        const stat = fs.statSync(filePathname); // 获取当前脚本状态
        const mtime = stat.mtime.toGMTString(); // 文件的最后修改时间
        const noneMatch = req.headers["if-none-match"]; // 来自浏览器端传递的值
        const requestMtime = req.headers["if-modified-since"]; // 来自浏览器传递的值
        if (mimeType && mimeType.indexOf("image") > -1) {
            res.writeHead(200, {
                "Cache-Control": "max-age=31536000", // 修改地方
                "Content-Type": `${mimeType}; charset=utf-8`,
            });
            res.write(readFileResponse.data);
            res.end();
            return;
        }
        if (noneMatch === fileMd5) {
            res.statusCode = 304;
            res.end();
            return;
        }
        if (requestMtime === mtime) {
            res.statusCode = 304;
            res.end();
            return;
        }
        res.writeHead(200, {
            // "Cache-Control": "no-cache",
            "Cache-Control": "no-cache", // 修改地方
            // Expires: getCurrentDate(5),
            // Fri Nov 12 2021 04:02:35 GMT+0800
            // "Expires": "Fri, 12 Nov 2021 04:04:35 GMT+0800",
            // "Etag": "strong",
            // "Last-Modified": Sat, 13 Nov 2021 12:54:33 GMT
            "Last-Modified": mtime,
            "Content-Type": `${mimeType}; charset=utf-8`,
            'ETag': fileMd5,
        });
        res.write(readFileResponse.data);
        res.end();
        return;
    }
    const readDirResponse = await readDir(filePathname);
    if (readDirResponse.isSuc) {
        res.writeHead(200, {
            "Content-Type": `text/html; charset=utf-8`,
        });
        const htmlList = readDirResponse.data
            .map((file) => {
                var filePathname = path.join(staticPath, urlPathname, file);
                return `<li>
                    <a href="/${filePathname}">
                        ${decodeURIComponent(file)}
                    </a>
                </li>`;
            })
            .join("");
        res.write(`<div>${htmlList}</div>`);
        res.end();
        return;
    }
    console.log("cannot read");
    res.writeHead(404);
    res.write("404 - File is not found!");
    res.end();
});

async function readDir(filePathname) {
    return new Promise((res, rej) => {
        fs.readdir(filePathname, (err, data) => {
            // 如果有问题返回 404
            if (err) {
                res({ isSuc: false });
            } else {
                res({ isSuc: true, data });
            }
        });
    });
}
async function readFile(filePathname) {
    return new Promise((res, rej) => {
        fs.readFile(filePathname, (err, data) => {
            // 如果有问题返回 404
            if (err) {
                res({ isSuc: false });
            } else {
                res({ isSuc: true, data });
            }
        });
    });
}

function getCurrentDate(second) {
    let res = "";
    if (second) {
        res = new Date(Date.now() + second * 1000).toUTCString();
    }
    res = res.split("(")[0];
    console.log(res);
    return res;
}
const port = 8989;
const currentIp = networkInterfaces().en0.find((e) => e.family === "IPv4");
server.listen(port, () => {
    // listen ${port} success
    console.log(`
Available on:
  http://127.0.0.1:${port}
  http://${currentIp.address}:${port}
`);
});
