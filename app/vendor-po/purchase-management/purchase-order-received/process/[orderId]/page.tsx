import { redirect } from "next/navigation";

type Props = { params: { orderId: string } };

export default function Page({ params }: Props) {
  redirect(`/vendor-po/receive/process/${params.orderId}`);
}
