import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { Role } from '@prisma/client';

interface LoginResponse {
  access_token: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

interface SyncResult {
  added: string[];
  updated: string[];
  removed: string[];
}

describe('TextbookController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get<PrismaService>(PrismaService);
    await app.init();

    // Register and login a test teacher
    await request(app.getHttpServer()).post('/auth/register').send({
      email: 'e2e-teacher@test.com',
      password: 'password123',
      name: 'E2E Teacher',
      role: Role.TEACHER,
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'e2e-teacher@test.com',
        password: 'password123',
      });

    const body = loginResponse.body as LoginResponse;
    authToken = body.access_token;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.learningRecord.deleteMany();
    await prisma.knowledgePoint.deleteMany();
    await prisma.textbook.deleteMany();
    await prisma.user.deleteMany({
      where: { email: { contains: 'e2e-' } },
    });
    await app.close();
  });

  describe('GET /textbooks', () => {
    it('should return list of textbooks', () => {
      return request(app.getHttpServer())
        .get('/textbooks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as ApiResponse<unknown[]>;
          expect(body.success).toBe(true);
          expect(Array.isArray(body.data)).toBe(true);
        });
    });

    it('should return 401 without auth', () => {
      return request(app.getHttpServer()).get('/textbooks').expect(401);
    });
  });

  describe('POST /textbooks/sync', () => {
    it('should sync textbooks', () => {
      return request(app.getHttpServer())
        .post('/textbooks/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201)
        .expect((res) => {
          const body = res.body as ApiResponse<SyncResult>;
          expect(body.success).toBe(true);
          expect(body.data).toHaveProperty('added');
          expect(body.data).toHaveProperty('updated');
          expect(body.data).toHaveProperty('removed');
        });
    });
  });

  describe('GET /textbooks/:id', () => {
    it('should return 404 for non-existent textbook', () => {
      return request(app.getHttpServer())
        .get('/textbooks/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('POST /textbooks/:id/refresh', () => {
    it('should return 404 for non-existent textbook', () => {
      return request(app.getHttpServer())
        .post('/textbooks/non-existent-id/refresh')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('DELETE /textbooks/:id', () => {
    it('should return 404 for non-existent textbook', () => {
      return request(app.getHttpServer())
        .delete('/textbooks/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Role-based access control', () => {
    let studentToken: string;

    beforeAll(async () => {
      await request(app.getHttpServer()).post('/auth/register').send({
        email: 'e2e-student@test.com',
        password: 'password123',
        name: 'E2E Student',
        role: Role.STUDENT,
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'e2e-student@test.com',
          password: 'password123',
        });

      const body = loginResponse.body as LoginResponse;
      studentToken = body.access_token;
    });

    it('should allow student to read textbooks', () => {
      return request(app.getHttpServer())
        .get('/textbooks')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
    });

    it('should deny student to sync textbooks', () => {
      return request(app.getHttpServer())
        .post('/textbooks/sync')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });

    it('should deny student to delete textbooks', () => {
      return request(app.getHttpServer())
        .delete('/textbooks/some-id')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });
});
