// Help articles. Copy matches Figma 05 Web Features, page "08. Help" (LC / Help / Page).
// Section shape: { h, b?: [paragraphs], k?: "Bullet" | "Step", l?: [list rows], tip?: [title, message] }
export const HELP = [
  { group: "Getting started", pages: [
    { title: "What is Rafiki Tax?", intro: "Rafiki Tax helps your business keep proof for every shilling you spend, so your expenses count when you file your taxes.", s: [
      { h: "Why it matters", b: ["KRA now checks the expenses in your tax return against eTIMS invoices. An expense with no matching invoice that carries your business PIN may not be allowed, and that can mean more tax to pay."] },
      { h: "What Rafiki does", k: "Bullet", l: ["Reads your statements, receipts and chats.", "Checks each expense for a matching eTIMS invoice.", "Prepares invoices for small sellers who have none."] },
      { h: "How you use it", k: "Step", l: ["Connect what you have, like a statement or receipts.", "Review what Rafiki found. Accept, edit or dismiss each item.", "Send only when you are happy. Nothing goes to KRA without your tap."] }] },
    { title: "Set up your business", intro: "Tell Rafiki your KRA PIN once. It fills in the rest and you check it.", s: [
      { h: "Enter your PIN", b: ["Type your business KRA PIN. Rafiki uses it to find your business name and to see if you are registered for VAT."] },
      { h: "Check what Rafiki found", k: "Bullet", l: ["Your business name.", "Your VAT status.", "Fix anything that is wrong before you continue."] },
      { h: "Add your PIN card", b: ["After setup you can make a PIN card to show cashiers. You can also add your staff so they can use it too."], tip: ["Use the business PIN", "A personal PIN will not match your business expenses."] }] },
    { title: "Connect your data", intro: "Give Rafiki something to read. You choose what it sees, and connecting is never required.", s: [
      { h: "Pick a way in", k: "Bullet", l: ["Upload a statement from M-Pesa, Airtel Money or your bank.", "Share or forward receipts and messages, including on WhatsApp.", "Connect a business account, like an M-Pesa till or paybill, or an Airtel Money business wallet."] },
      { h: "What Rafiki can see", b: ["Only what you upload, forward or connect. Rafiki never reads your personal wallet or your personal WhatsApp."] },
      { h: "You can change your mind", b: ["Start with one way and add more later. You can disconnect at any time in Settings."] }] },
    { title: "Your first finding", intro: "After Rafiki reads your data, it shows what it found in plain words.", s: [
      { h: "The big picture", b: ["Rafiki shows how much you spent and how much of it is at risk. For example: of KSh 820,000 last quarter, KSh 140,000 is at risk."] },
      { h: "Your top three fixes", k: "Step", l: ["Open the first fix.", "Do what it says, or dismiss it.", "Move on to the next one."] },
      { h: "Where it comes from", b: ["Under the finding, Rafiki names its source, like “Read from your Airtel Money statement”, so you know what it is based on."] }] },
  ] },
  { group: "Home", pages: [
    { title: "The review queue", intro: "Home shows what needs your decision today, and nothing else.", s: [
      { h: "The three tiles", k: "Bullet", l: ["At risk: expenses with no matching invoice.", "Waiting on sellers: invoices you sent that need approval.", "Covered: expenses that are in order."] },
      { h: "Your list of decisions", b: ["Under the tiles is a short list of items where Rafiki needs you. Rafiki prepares each one and you decide."] },
      { h: "Drafts from messages", b: ["If you forward a message from a seller, the draft appears here too, ready for you to check."] }] },
    { title: "Decide on an item", intro: "Each item opens in a side panel, so you can decide without leaving Home.", s: [
      { h: "What you see", k: "Bullet", l: ["What Rafiki suggests.", "How sure Rafiki is.", "A Why? link that explains the suggestion."] },
      { h: "Your three choices", k: "Bullet", l: ["Accept: use the suggestion as it is.", "Edit: change it, then accept.", "Dismiss: leave it out."] },
      { h: "Nothing is sent for you", b: ["Rafiki never sends anything to KRA or to a seller until you confirm it."] }] },
    { title: "When all is clear", intro: "When nothing needs you, Home says so.", s: [
      { h: "What you will see", b: ["A calm screen that says all is clear, with a short list of what Rafiki covered this week."] },
      { h: "What it means", b: ["Nothing is waiting for your decision. You do not need to check anything."] },
      { h: "What brings items back", k: "Bullet", l: ["New data you upload or connect.", "A seller who rejects an invoice or lets it expire.", "A forwarded message that Rafiki has drafted."] }] },
  ] },
  { group: "Purchases", pages: [
    { title: "Your purchases list", intro: "All your expenses in one place, each with a status you can read at a glance.", s: [
      { h: "Read the status", b: ["Every row has a status with an icon and a word: Covered, Exempt, Needs fixing or At risk. Declared means you declared it without eTIMS."] },
      { h: "Find what you need", k: "Bullet", l: ["Filter by status to see only what needs fixing.", "Open any row to see its details."] },
      { h: "What to look at first", b: ["Start with At risk, then Needs fixing. Those are the ones that can cost you at tax time."] }] },
    { title: "What the statuses mean", intro: "Every purchase gets a status so you can see what needs your attention. Each status has an icon and a word, never colour alone.", s: [
      { h: "Covered and Exempt", b: ["Covered means a matching eTIMS invoice with your PIN was found. Exempt means KRA does not ask for an invoice for that kind of expense, like salaries or bank charges."] },
      { h: "Needs fixing and At risk", b: ["Needs fixing means something small is missing, like your PIN on the receipt. At risk means no matching invoice was found, so KRA might not accept the expense."], tip: ["Fix it at the counter", "If a cashier misses your PIN, ask them to reissue the receipt before you leave."] },
      { h: "Purchases from small sellers", b: ["When a small seller has no eTIMS, you raise a buyer-initiated invoice. Rafiki shows where it is:"], k: "Bullet", l: ["Sent to seller: waiting for approval.", "Approved: the seller agreed. This is the strongest proof.", "Rejected or Expired: Rafiki shows your next step."] }] },
    { title: "Check a purchase", intro: "Open one expense to see everything Rafiki knows about it, or check a receipt at the till.", s: [
      { h: "Inside an expense", k: "Bullet", l: ["The amount, the seller and the status.", "Where it came from: a receipt, a message or a mobile money line.", "What Rafiki did, step by step.", "Actions you can take next."] },
      { h: "At the counter", k: "Step", l: ["Open the camera on your phone and frame the receipt.", "Rafiki reads it and tells you if it is covered.", "If your PIN is missing, ask the cashier to reissue it before you leave."] },
      { h: "Show your PIN card", b: ["Show the PIN card on your phone so the cashier can enter or scan your business PIN."] }] },
    { title: "The purchases tracker", intro: "Follow every buyer-initiated invoice from sent to approved.", s: [
      { h: "The groups", k: "Bullet", l: ["Waiting on sellers.", "Expiring soon.", "Approved.", "Rejected or expired."] },
      { h: "Money still waiting", b: ["The tracker adds up the KSh still waiting for approval, so you can see what is not yet proven."] },
      { h: "Take it with you", b: ["Use Export to download the list as a CSV file."] }] },
  ] },
  { group: "Suppliers", pages: [
    { title: "Your suppliers", intro: "The sellers you buy from, and what you are waiting on from each.", s: [
      { h: "The list", b: ["Each supplier shows whether they are on eTIMS and VAT, and how much is waiting on them."] },
      { h: "Rafiki spots suppliers", b: ["If you pay the same number often, Rafiki asks: “You pay 0712… every Saturday. Is this a supplier?”"] },
      { h: "Confirm a supplier", k: "Step", l: ["Say yes, this is a supplier.", "Add their PIN or ID if you have it.", "Confirm the network, like M-Pesa or Airtel Money."], tip: ["You confirm the network", "Rafiki never guesses it from a phone number."] }] },
    { title: "A supplier's profile", intro: "Everything about one supplier on one page.", s: [
      { h: "What is on it", k: "Bullet", l: ["Their details and payment details.", "Their invoices, each with a countdown.", "Messages and payments linked to them.", "When you last sent a reminder."] },
      { h: "Move around", b: ["Use the tabs Invoices, Payments and History to find what you need."] },
      { h: "What you can do", k: "Bullet", l: ["Draft an invoice.", "Remind the seller.", "Repeat your last invoice.", "Pay, if payments are turned on.", "Import a chat."] }] },
    { title: "Remind a seller", intro: "Some sellers need a nudge. Rafiki writes it and you send it.", s: [
      { h: "How it works", k: "Step", l: ["Choose Remind on the supplier or the invoice.", "Check the message Rafiki wrote, in Swahili or English.", "Send it yourself from your own WhatsApp or SMS."] },
      { h: "What the message says", b: ["It tells the seller how to approve the invoice on their phone by dialling *222#. If the seller is new to eTIMS, Rafiki also has a short guide you can forward."] },
      { h: "Rafiki does not message sellers", b: ["Rafiki never contacts a seller for you. You always send the reminder yourself."] }] },
    { title: "Pay a supplier", intro: "Pay a supplier from inside Rafiki, but only if you turn it on.", s: [
      { h: "Turn it on first", b: ["Paying is off until you turn it on in Settings, under Connected data. It is separate from letting Rafiki read your account."] },
      { h: "Make a payment", k: "Step", l: ["Choose Pay on a purchase.", "Check who you are paying, the network and the amount.", "Enter your app PIN to confirm."] },
      { h: "What happens next", b: ["Rafiki waits for the network, then shows Sent with a reference. The payment and a draft invoice are made together. If it fails, no money leaves your account and you can try again."], tip: ["You always confirm", "Rafiki never pays on its own."] }] },
  ] },
  { group: "Invoice Builder", pages: [
    { title: "Start an invoice", intro: "Rafiki drafts your invoice. You choose where it starts.", s: [
      { h: "Your saved drafts", b: ["The Invoice Builder opens with your saved drafts and a New invoice button. If you have none, it helps you start one."] },
      { h: "Choose a source", k: "Bullet", l: ["A mobile money payment.", "A photo of a receipt.", "A voice note or a typed message.", "A chat you shared or forwarded.", "Your last invoice, to repeat it."] },
      { h: "Check the draft", b: ["Rafiki fills in the details and marks them. You check each one before you go on."] }] },
    { title: "Buyer-initiated invoices", intro: "A buyer-initiated invoice, or BII, is an invoice you raise yourself when you buy from a small seller who cannot issue an eTIMS invoice.", s: [
      { h: "How it works", k: "Step", l: ["Rafiki drafts the invoice from a payment, receipt, chat or voice note.", "You check it and send it to the seller.", "The seller approves it on their phone with *222# within 30 days."] },
      { h: "Who it is for", b: ["Use it for small sellers like a market vendor or a fundi. If the seller is registered for VAT, KRA does not allow it. Ask them for a normal eTIMS invoice instead."] },
      { h: "If the seller does not respond", b: ["After 30 days the invoice expires. Rafiki then shows your next steps: remind the seller, draft it again, or declare the purchase without eTIMS."] }] },
    { title: "Check and send", intro: "Look over the draft, then send it. Once sent, it cannot be taken back.", s: [
      { h: "Check what Rafiki filled in", k: "Bullet", l: ["Fields Rafiki filled in show how sure it is.", "Choose Why? to see where it found a detail.", "If a word is unclear, Rafiki asks you with tap options."] },
      { h: "The final check", b: ["Before sending, a last screen lists exactly what will go to the seller."] },
      { h: "After you send", b: ["The invoice moves to Sent and waiting, where you can follow it."], tip: ["Sending cannot be undone", "Check the amount and the seller before you confirm."] }] },
    { title: "Sent and waiting", intro: "See where your invoice is while the seller decides.", s: [
      { h: "What you see", k: "Bullet", l: ["The status of the invoice.", "A countdown of the 30 days the seller has.", "The seller’s next step."] },
      { h: "If the seller is slow", b: ["Choose Remind to write a nudge that you can send yourself."] },
      { h: "Follow all of them", b: ["The purchases tracker shows every invoice that is waiting, so you do not have to check one by one."] }] },
    { title: "Credit notes", intro: "A credit note corrects an invoice that was already approved.", s: [
      { h: "When to use one", b: ["Use a credit note if the amount was wrong, something was returned, or the invoice should not have been made."] },
      { h: "How it works", k: "Step", l: ["Open the approved invoice and choose Credit note.", "Rafiki fills in the reversal for you.", "Check it and send it, like any invoice."] },
      { h: "Where it shows", b: ["The credit note is added to the evidence trail for that purchase."] }] },
  ] },
  { group: "Evidence", pages: [
    { title: "Evidence list", intro: "See every transaction together with the records behind it.", s: [
      { h: "What the list shows", b: ["Each row is one transaction with the records Rafiki has linked to it: receipts, messages, payments and invoices."] },
      { h: "Pick rows", k: "Bullet", l: ["Select one or more rows.", "Choose Export to prepare a pack from them.", "Open a row to see its trail."] },
      { h: "When it is empty", b: ["If nothing is linked yet, the list is empty. Connect your data and Rafiki will fill it in."] }] },
    { title: "What the agent did", intro: "The steps Rafiki took for a purchase, and where it stopped.", s: [
      { h: "Read the steps", b: ["Each step is a box. Rafiki shows what it found at each one, from the first receipt or message to the invoice."] },
      { h: "Steps that are yours", b: ["When a step needs you, like a payment or a forwarded message, it is marked Your action. Rafiki stops there and waits."] },
      { h: "Why it helps", k: "Bullet", l: ["You see how Rafiki reached its answer.", "You can find where something got stuck.", "You can show the steps to your accountant."] }] },
    { title: "Evidence trail", intro: "The evidence trail shows the records behind one purchase, in order, so you can prove it if KRA asks.", s: [
      { h: "What you will see", k: "Bullet", l: ["The receipt or chat message the purchase came from.", "The mobile money payment, with its network.", "The eTIMS invoice, or the credit note if there is one.", "The line in your tax return."] },
      { h: "Why the order matters", b: ["Records are shown from oldest to newest. This shows how each step led to the next, from the payment to the invoice."] },
      { h: "Share it", b: ["Use Export to download a pack as a ZIP or a PDF. You can give it to KRA or to your accountant."] }] },
    { title: "Export a pack", intro: "Download the records for a purchase to give to KRA or your accountant.", s: [
      { h: "How to export", k: "Step", l: ["Choose the transactions you want.", "Choose Export and check the preview.", "Download it as a ZIP or a PDF."] },
      { h: "If a record is missing", b: ["Rafiki warns you but still lets you export. You can add the missing record later."], tip: ["A warning, not a block", "Check the preview to see what is missing."] },
      { h: "Who it is for", b: ["Packs are made for KRA or for your accountant. Share them only with people who need them."] }] },
  ] },
  { group: "Settings", pages: [
    { title: "Business profile", intro: "The details Rafiki uses for your business.", s: [
      { h: "What is in it", k: "Bullet", l: ["Business name.", "KRA PIN.", "VAT status.", "Address."] },
      { h: "Keep it correct", b: ["Invoices and checks use these details. If your PIN or VAT status changes, update them here."] },
      { h: "Where it came from", b: ["Rafiki filled these in when you set up your business, and you checked them then."] }] },
    { title: "Staff and PIN cards", intro: "Let your team use the business PIN without sharing your login.", s: [
      { h: "Add a person", k: "Step", l: ["Choose Add staff.", "Enter their name and phone number.", "Issue them a PIN card."] },
      { h: "What a PIN card does", b: ["It shows the business PIN and a QR code, so a cashier can enter or scan it."] },
      { h: "Forwarding messages", b: ["You can also link the numbers allowed to forward messages to Rafiki on WhatsApp. Each number is checked with a code, and messages from other numbers are rejected."] }] },
    { title: "Connected data", intro: "Connected data is where you choose how Rafiki gets your payment information. You are always in charge, and you can disconnect at any time.", s: [
      { h: "Three ways to connect", k: "Bullet", l: ["Snapshots: upload a statement or receipts. This is always on.", "Business account: Rafiki reads payments from your M-Pesa till or Airtel Money business wallet. Read only.", "Pay through Rafiki: pay a supplier from inside Rafiki. Off until you turn it on."] },
      { h: "What Rafiki can and cannot do", b: ["Rafiki only sees your business account, never your personal wallet. Reading and paying are separate permissions. Rafiki never pays on its own: you confirm every payment."] },
      { h: "Disconnect", b: ["Choose a network and select Disconnect. You decide whether to keep or delete the history Rafiki already imported."] }] },
    { title: "Notifications", intro: "Choose which updates you get, and how you get them.", s: [
      { h: "What Rafiki tells you", k: "Bullet", l: ["An invoice is approved or rejected.", "An invoice is about to expire, or has expired.", "Rafiki found something new.", "A payment was sent or failed."] },
      { h: "Where you see them", b: ["Select the bell at the top. New updates have a dot and the words “N unread”, so you can tell them apart without colour."] },
      { h: "Choose how", b: ["In Settings you can pick which updates you want, turn on an SMS back-up and get a daily digest."] }] },
    { title: "Data and privacy", intro: "See what Rafiki can read, and take your data with you or delete it.", s: [
      { h: "What Rafiki can see", k: "Bullet", l: ["What you upload.", "Messages you share or forward.", "Business accounts you connect."] },
      { h: "What it cannot see", b: ["Your personal wallet and your personal WhatsApp."] },
      { h: "Export or delete", b: ["You can export your data or delete it. When you disconnect a network, you choose to keep or delete what Rafiki already imported."] }] },
  ] },
  { group: "Search and Ask Rafiki", pages: [
    { title: "Search", intro: "Find a supplier, receipt, invoice or setting fast.", s: [
      { h: "Quick search", k: "Step", l: ["Select the search box at the top, or press Cmd+K.", "Type a few letters.", "Pick a result to open it."] },
      { h: "Results", b: ["Results are grouped: suppliers, receipts, invoices, evidence, settings and actions. Select See all to open a full page."] },
      { h: "When nothing matches", b: ["Rafiki says so and offers to hand your question to Ask Rafiki."] }] },
    { title: "Ask Rafiki", intro: "Ask Rafiki is your helper inside the app. Ask in plain English, Swahili or a mix, and it points you to the right place.", s: [
      { h: "What you can ask", k: "Bullet", l: ["Find things: “Where is the Kenya Power receipt?”", "Understand things: “What does At risk mean?”", "Start something: “Draft an invoice for Mama Njeri.”"] },
      { h: "What Rafiki will not do", b: ["Ask Rafiki never sends anything to KRA, messages a seller, pays or changes your data on its own. When you ask it to start something, it opens the normal screen so you can check it first."] },
      { h: "When Rafiki does not know", b: ["It says so instead of guessing. For rules from KRA, it tells you where the answer comes from."] }] },
  ] },
];

export const slug = (t) => t.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
export const HELP_FLAT = HELP.flatMap((g) => g.pages.map((p) => ({ ...p, group: g.group, id: slug(p.title) })));
