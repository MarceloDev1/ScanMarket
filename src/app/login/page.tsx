import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar · PricePulse" };

export default async function LoginPage(props: PageProps<"/login">) {
  const { error } = await props.searchParams;

  return (
    <div className="mx-auto max-w-sm pt-10">
      <h1 className="text-3xl font-bold tracking-tight">PricePulse</h1>
      <p className="mb-8 mt-1 text-sm text-muted">
        Entre para guardar suas notas e acompanhar os preços.
      </p>
      <LoginForm linkError={error === "link"} />
    </div>
  );
}
