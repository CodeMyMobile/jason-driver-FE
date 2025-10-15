const now = Date.now()

const previewBaseOrder = {
  _id: 'preview-order',
  orderNumber: 'JD-48271',
  status: 'Assigned',
  createdAt: new Date(now - 8 * 60 * 1000).toISOString(),
  deliveryNote:
    'Call upon arrival. Customer requested handoff at the lobby security desk for signature.',
  owner: {
    name: { first: 'Jordan', last: 'Simmons' },
    phoneNumber: '5551239845',
    email: 'jordan.simmons@example.com',
    orderCount: 1,
  },
  address: {
    street1: '1459 Mission St',
    street2: 'Suite 210',
    city: 'San Francisco',
    state: 'CA',
    zip: '94103',
    description: 'Deliver to the glass tower lobby – security will badge you in.',
    apartment: '210',
    loc: [-122.414863, 37.775602],
  },
  items: [
    { id: 'jd-01', name: 'Small Batch Bourbon', quantity: 1, price: 42.99 },
    { id: 'jd-02', name: 'Sparkling Water (6 pack)', quantity: 2, price: 9.99 },
    { id: 'jd-03', name: 'Reusable Tote', quantity: 1, price: 4.5 },
  ],
  totals: {
    subTotal: 67.47,
    delivery: 4.99,
    tax: 5.86,
    grandTotal: 78.32,
  },
  total: 78.32,
  paymentMethod: 'pm_preview_4242',
  cardDetails: {
    brand: 'visa',
    last4: '4242',
    exp_month: '08',
    exp_year: '28',
  },
  giftDelivery: false,
}

export default previewBaseOrder
