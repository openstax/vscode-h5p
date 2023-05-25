import * as H5P from '@lumieducation/h5p-server';

export default class User implements H5P.IUser {
  constructor() {
    this.id = '1';
    this.name = 'Mock User';
    this.canInstallRecommended = true;
    this.canUpdateAndInstallLibraries = true;
    this.canCreateRestricted = true;
    this.type = 'local';
    this.email = 'test@openstax.com';
  }

  public canCreateRestricted: boolean;
  public canInstallRecommended: boolean;
  public canUpdateAndInstallLibraries: boolean;
  public email: string;
  public id: string;
  public name: string;
  public type: 'local';
}
