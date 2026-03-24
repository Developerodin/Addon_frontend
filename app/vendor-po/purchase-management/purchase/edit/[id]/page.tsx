import { redirect } from "next/navigation";

type Props = { params: { id: string } };

export default function Page({ params }: Props) {
  redirect(`/vendor-po/raise/edit/${params.id}`);
}
