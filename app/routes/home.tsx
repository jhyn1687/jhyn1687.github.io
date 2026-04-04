import type { Route } from "./+types/home";

export function meta(_args: Route.MetaArgs) {
  return [
    { title: "Tony Yuan" },
    { name: "description", content: "Tony Yuan's Portfolio" },
  ];
}

export default function Home() {
  return <div>Home</div>;
}
