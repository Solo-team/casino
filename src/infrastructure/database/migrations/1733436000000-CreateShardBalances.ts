import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateShardBalances1733436000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "player_shard_balances",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        generationStrategy: "uuid",
                        default: "uuid_generate_v4()"
                    },
                    {
                        name: "player_id",
                        type: "uuid",
                        isNullable: false
                    },
                    {
                        name: "shard_tier_s",
                        type: "integer",
                        default: 0
                    },
                    {
                        name: "shard_tier_a",
                        type: "integer",
                        default: 0
                    },
                    {
                        name: "shard_tier_b",
                        type: "integer",
                        default: 0
                    },
                    {
                        name: "shard_tier_c",
                        type: "integer",
                        default: 0
                    },
                    {
                        name: "total_shards_earned",
                        type: "integer",
                        default: 0
                    },
                    {
                        name: "nfts_redeemed",
                        type: "integer",
                        default: 0
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "now()"
                    },
                    {
                        name: "updated_at",
                        type: "timestamp",
                        default: "now()"
                    }
                ]
            }),
            true
        );

        // Create unique index on player_id
        await queryRunner.createIndex(
            "player_shard_balances",
            new TableIndex({
                name: "IDX_PLAYER_SHARD_BALANCES_PLAYER_ID",
                columnNames: ["player_id"],
                isUnique: true
            })
        );

        // Create index on updated_at for queries
        await queryRunner.createIndex(
            "player_shard_balances",
            new TableIndex({
                name: "IDX_PLAYER_SHARD_BALANCES_UPDATED_AT",
                columnNames: ["updated_at"]
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("player_shard_balances");
    }
}
