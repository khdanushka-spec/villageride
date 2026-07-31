import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    question: "How are fares calculated?",
    answer:
      "Each association sets its own base fare, per-km rate, and per-minute rate for every vehicle type. You'll always see an estimate before you request a ride.",
  },
  {
    question: "Who approves new drivers?",
    answer:
      "Your local village taxi association reviews every driver application — license, NIC, vehicle registration, and insurance — before they can go online.",
  },
  {
    question: "What payment methods are supported?",
    answer: "Cash, credit/debit card, PayHere, Stripe, and your V Rides wallet balance.",
  },
  {
    question: "Can I use V Rides outside Sri Lanka?",
    answer:
      "V Rides currently operates only in Sri Lanka. The platform is architected to support additional countries in the future.",
  },
  {
    question: "What happens if my driver cancels?",
    answer:
      "You're notified immediately and can request a new ride right away — nearby drivers are automatically notified again.",
  },
];

export function Faq() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Frequently asked questions</h2>
      </div>

      <Accordion className="mt-10 w-full">
        {faqs.map((faq, index) => (
          <AccordionItem key={faq.question} value={`item-${index}`}>
            <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
