const express = require("express");
const httpProxy = require("http-proxy");
const app = express();
const { PrismaClient } = require("@prisma/client");
const PORT = 8000;
const BASE_PATH = `https://launchpad-bucket-build.s3.amazonaws.com/__outputs`;

const proxy = httpProxy.createProxy();

const prisma = new PrismaClient({});

app.use(async (req, res) => {
  const hostname = req.hostname;
  const subdomain = hostname.split(".")[0];
  console.log("req here ", req.hostname);

  try {
    const projectData = await prisma.project.findFirst({
      where: { subDomain: subdomain },
    });

    let deploymentData;
    if (projectData) {
      deploymentData = await prisma.deployement.findFirst({
        where: { production: true, projectId: projectData.id },
      });
    } else {
      deploymentData = await prisma.deployement.findFirst({
        where: { deployementDomain: subdomain },
      });
    }

    console.log("deploymentData", deploymentData);
    if (!deploymentData) {
      throw new Error(`Deployment data not found for subdomain ${subdomain}`);
    }
    const resolvesTo = `${BASE_PATH}/${deploymentData.id}`;
    console.log("resolves to ", subdomain);

    return proxy.web(req, res, { target: resolvesTo, changeOrigin: true });
  } catch (error) {
    console.error("Error fetching deployment data:", error);
    res.status(500).send("Error fetching deployment data");
  }
});

proxy.on("proxyReq", (proxyReq, req, res) => {
  const url = req.url;
  if (url === "/") {
    proxyReq.path += "index.html";
  }
});

app.listen(PORT, () => console.log(`Reverse Proxy Running on port..${PORT}`));
