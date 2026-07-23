import { Test } from '@nestjs/testing';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsController', () => {
  let controller: OrganizationsController;
  const service = {
    listMembers: jest.fn(),
    updateSettings: jest.fn(),
    updateMemberRole: jest.fn(),
    removeMember: jest.fn(),
    createInvitation: jest.fn(),
    listPendingInvitations: jest.fn(),
    revokeInvitation: jest.fn(),
  };
  const user = {
    id: 'admin-1',
    email: 'admin@a.com',
    organizationId: 'org-1',
    rol: 'ADMIN' as const,
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [OrganizationsController],
      providers: [{ provide: OrganizationsService, useValue: service }],
    }).compile();

    controller = module.get(OrganizationsController);
  });

  it('listMembers delega en el servicio con el organizationId', async () => {
    await controller.listMembers(user);
    expect(service.listMembers).toHaveBeenCalledWith('org-1');
  });

  it('updateSettings delega en el servicio con el organizationId y el dto', async () => {
    const dto = { tarifaManoObraHora: 15000, tarifaEnergiaHora: 5000 };
    await controller.updateSettings(user, dto);
    expect(service.updateSettings).toHaveBeenCalledWith('org-1', dto);
  });

  it('updateMemberRole delega con organizationId, id del miembro, quien pide el cambio y el dto', async () => {
    const dto = { rol: 'COORDINADOR' as const };
    await controller.updateMemberRole(user, 'miembro-1', dto);
    expect(service.updateMemberRole).toHaveBeenCalledWith(
      'org-1',
      'miembro-1',
      'admin-1',
      dto,
    );
  });

  it('removeMember delega con organizationId, id del miembro y quien lo remueve', async () => {
    await controller.removeMember(user, 'miembro-1');
    expect(service.removeMember).toHaveBeenCalledWith(
      'org-1',
      'miembro-1',
      'admin-1',
    );
  });

  it('createInvitation delega con organizationId, quien la crea y el dto', async () => {
    const dto = { rol: 'MIEMBRO' as const };
    await controller.createInvitation(user, dto);
    expect(service.createInvitation).toHaveBeenCalledWith(
      'org-1',
      'admin-1',
      dto,
    );
  });

  it('listPendingInvitations delega en el servicio con el organizationId', async () => {
    await controller.listPendingInvitations(user);
    expect(service.listPendingInvitations).toHaveBeenCalledWith('org-1');
  });

  it('revokeInvitation delega con organizationId y el id de la invitacion', async () => {
    await controller.revokeInvitation(user, 'inv-1');
    expect(service.revokeInvitation).toHaveBeenCalledWith('org-1', 'inv-1');
  });
});
