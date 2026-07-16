import { MigrationInterface, QueryRunner } from "typeorm";

export class MyMigration1784239180386 implements MigrationInterface {
    name = 'MyMigration1784239180386'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "users" ("userId" uuid NOT NULL DEFAULT uuid_generate_v4(), "login" text NOT NULL, "email" text NOT NULL, "password" text NOT NULL, "age" integer NOT NULL, "description" text NOT NULL, "updated_at" bigint, "deleted_at" bigint, CONSTRAINT "PK_8bf09ba754322ab9c22a215c919" PRIMARY KEY ("userId"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "users"`);
    }

}
