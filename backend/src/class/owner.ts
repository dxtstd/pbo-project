import { Person } from './person';
import type Room from './room';

export default class Owner extends Person {
  private readonly rooms: Room[] = [];

  public constructor(
    ownerId: string,
    username: string,
    firstname: string,
    lastname: string,
    phoneNumber: string,
  ) {
    super(ownerId, username, firstname, lastname, phoneNumber);
  }

  public addRoom(room: Room): void {
    if (!this.rooms.includes(room)) this.rooms.push(room);
  }

  public getRooms(): readonly Room[] {
    return this.rooms;
  }

  public getTotalMonthlyIncome(): number {
    return this.rooms.reduce((total, room) => total + room.getMonthlyPrice(), 0);
  }
}