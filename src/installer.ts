import { opamExec } from "./internal/system";
import { acquireOpam, installDepext } from "./opam";

export async function installer(): Promise<void> {
  await acquireOpam();
  await installDepext();
  await opamExec(["--version"]);
  await opamExec(["exec", "--", "ocaml", "--version"]);
  await opamExec(["depext", "--version"]);
}
