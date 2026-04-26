import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  index("portfolio/routes/home.tsx"),
  layout("splitter/routes/splitter.layout.tsx", [
    route("splitter", "splitter/routes/splitter.tsx"),
    route("splitter/new", "splitter/routes/splitter.new.tsx"),
    route("splitter/settings", "splitter/routes/splitter.settings.tsx"),
    route("splitter/share/:code", "splitter/routes/splitter.share.$code.tsx"),
    route("splitter/:billId", "splitter/routes/splitter.$billId.tsx"),
  ]),
  route("api/parse-receipt", "splitter/routes/api.parse-receipt.ts"),
  route("api/share-bill", "splitter/routes/api.share-bill.ts"),
  route("api/bill/:code", "splitter/routes/api.bill.$code.ts"),
] satisfies RouteConfig;
