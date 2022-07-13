/* eslint-disable no-console */
// eslint-disable-next-line import/no-extraneous-dependencies
import { defineEndpoint } from "@directus/extensions-sdk";

import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import busboy from "busboy";

export default defineEndpoint((router) => {
	router.get("/", (_req, res) => res.send("Custom endpoints for Directus snapshot import/export"));
	router.get("/ping", (_req, res) => res.send("pong"));
	router.get("/export", (_req, res) => {
		if (!_req.accountability.admin) {
			res.sendStatus(401);
			return;
		}

		try {
			const cmd = spawn("npx", ["directus", "schema", "snapshot", "--yes", "./snapshot.yaml"]);

			cmd.stdout.on("data", (data : any) => {
				console.log(`stdout: ${data}`);
			});

			cmd.stderr.on("data", (data : any) => {
				console.error(`stderr: ${data}`);
			});

			cmd.on("close", (code : number) => {
				console.log(`child process exited with code ${code}`);
				if (code === 0) {
					res.sendFile(path.join(`${__dirname}/../../../snapshot.yaml`));
				} else {
					res.status(500).send("Issue while generating snapshot");
				}
			});
		} catch (error) {
			console.error(error);
			res.status(500).send(error);
		}
	});

	router.post("/import", (_req, res) => {
		if (!_req.accountability.admin) {
			res.sendStatus(401);
			return;
		}

		try {
			const bb = busboy({ headers: _req.headers });

			bb.on("file", (_name, file) => {
				file.pipe(fs.createWriteStream("./import.yaml"));
			});

			bb.on("close", () => {
				const cmd = spawn("npx", ["directus", "schema", "apply", "--yes", "./import.yaml"]);

				cmd.stdout.on("data", (data : any) => {
					console.log(`stdout: ${data}`);
				});

				cmd.stderr.on("data", (data : any) => {
					console.error(`stderr: ${data}`);
				});

				cmd.on("close", (code : number) => {
					console.log(`child process exited with code ${code}`);
					if (code === 0) {
						res.json({ message: "Schema successfully imported" });
					} else {
						res.status(500).send("Issue while importing snapshot");
					}
				});
			});

			_req.pipe(bb);
		} catch (error) {
			console.error(error);
			res.status(500).send(error);
		}
	});
});
