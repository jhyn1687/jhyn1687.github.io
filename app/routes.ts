import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("splitter", "routes/splitter.tsx"),
  route("api/parse-receipt", "routes/api.parse-receipt.ts"),
  route("api/share-bill", "routes/api.share-bill.ts"),
  route("api/bill/:code", "routes/api.bill.$code.ts"),
] satisfies RouteConfig;
