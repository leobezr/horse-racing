describe("race regression flow", () => {
  it("initializes pool, places 500 chip, opens setup modal, and starts race", () => {
    cy.visit("/");

    let beforeCredit = 0;

    cy.get('[data-test="app-race-section"]').should("be.visible");
    cy.get('[data-test="app-race-chip"]').contains("500").click();

    cy.get('[data-test="app-race-credit"]').invoke("text").then((beforeCreditText) => {
      beforeCredit = Number.parseInt(beforeCreditText.replace(/[^0-9]/g, ""), 10);
    });

    cy.get('[data-test="app-race-run-button"]').click();
    cy.get('[data-test="app-race-setup-modal"]').should("be.visible");

    cy.get('[data-test="app-race-setup-horse"]').first().click();
    cy.get('[data-test="app-race-setup-next"]').should("not.be.disabled").click();

    cy.get('[data-test="app-race-setup-modal"]').should("not.exist");
    cy.get('[data-test="app-race-credit"]').should(($credit) => {
      const afterCredit = Number.parseInt($credit.text().replace(/[^0-9]/g, ""), 10);
      expect(afterCredit).to.be.lessThan(beforeCredit);
    });

    cy.get('[data-test="app-race-canvas"]').should("be.visible");
    cy.get('[data-test="app-race-live-row"]', { timeout: 30000 }).should(
      "have.length.greaterThan",
      0,
    );
  });
});
