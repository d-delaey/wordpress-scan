const crypto = require("crypto");
const fs = require("fs");

module.exports = {
    getFileHash(filename) {
        return new Promise((resolve, reject) => {
            let shasum = crypto.createHash("md5");
            try {
                let s = fs.ReadStream(filename);
                s.on("data", function (data) {
                    shasum.update(data);
                });
                s.on("end", function () {
                    const hash = shasum.digest("hex");
                    return resolve(hash);
                });
            } catch (error) {
                return reject("calc fail");
            }
        });
    },
};
