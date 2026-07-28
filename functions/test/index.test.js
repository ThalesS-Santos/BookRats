describe('functions bootstrap', () => {
  it('carrega o entrypoint sem lançar erro', () => {
    expect(() => require('../src/index')).not.toThrow();
  });
});
