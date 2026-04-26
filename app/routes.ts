import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("splitter", "routes/splitter.tsx"),
  route("splitter/new", "routes/splitter.new.tsx"),
  route("splitter/settings", "routes/splitter.settings.tsx"),
  route("splitter/share/:code", "routes/splitter.share.$code.tsx"),
  route("splitter/:billId", "routes/splitter.$billId.tsx"),
  route("api/parse-receipt", "routes/api.parse-receipt.ts"),
  route("api/share-bill", "routes/api.share-bill.ts"),
  route("api/bill/:code", "routes/api.bill.$code.ts"),
] satisfies RouteConfig;
