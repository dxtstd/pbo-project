export abstract class Person {
  protected constructor(
    private readonly id: string,
    private username: string,
    private firstname: string,
    private lastname: string,
    private phoneNumber: string,
  ) {
    if (!id || !username) {
      throw new Error('ID dan username wajib diisi');
    }
  }

  public getId(): string {
    return this.id;
  }

  public getFullName(): string {
    return `${this.firstname} ${this.lastname}`.trim();
  }

  public updateContact(phoneNumber: string): void {
    if (!phoneNumber.trim()) {
      throw new Error('Nomor telepon wajib diisi');
    }
    this.phoneNumber = phoneNumber;
  }

  public getProfile(): Readonly<Record<string, string>> {
    return {
      id: this.id,
      username: this.username,
      firstname: this.firstname,
      lastname: this.lastname,
      phoneNumber: this.phoneNumber,
    };
  }
}
