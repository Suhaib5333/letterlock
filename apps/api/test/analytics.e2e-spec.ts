import { Harness } from './harness';

describe('analytics (Phase 7b)', () => {
  const h = new Harness();
  beforeAll(() => h.start());
  afterAll(() => h.stop());

  it('POST /events ingests a batch without auth and rejects an oversized one', async () => {
    await h
      .http()
      .post('/events')
      .send({ anonId: 'anon-1', events: [{ name: 'session_start' }, { name: 'ad_served', props: { format: 'interstitial' } }] })
      .expect(204);

    await h
      .http()
      .post('/events')
      .send({ anonId: 'anon-1', events: Array.from({ length: 51 }, () => ({ name: 'spam' })) })
      .expect(400);
  });

  it('GET /admin/analytics needs admin and then reports the counts', async () => {
    await h.http().get('/admin/analytics').expect(401);

    const admin = await h.player('analytics-admin@example.com', 'analyticsadmin');
    await h.makeAdmin(admin);
    const res = await h.http().get('/admin/analytics?days=7').set(h.auth(admin)).expect(200);
    expect(res.body.days).toBe(7);
    const names = Object.fromEntries(res.body.byName.map((b: { name: string; count: number }) => [b.name, b.count]));
    expect(names.session_start).toBe(1);
    expect(names.ad_served).toBe(1);
    expect(res.body.daily.length).toBeGreaterThan(0);
    expect(res.body.retention.cohort).toBeGreaterThan(0);
  });
});
