(function() {
  'use strict';

  /* ==========================================================
     GameRules 数据
     id       —— GameRules.java（26.x）的 snake_case id
     langKey  —— 你 zh_cn.json 里实际的 key（去掉 gamerule. 前缀）
                 null 表示走 gamerule.minecraft.<id>（新格式 4 条）
     ========================================================== */
  window.__mcGameRules = [
    /* ---------- PLAYER ---------- */
    { id: 'drowning_damage',                      langKey: 'drowningDamage',                    type: 'bool', default: true,  cat: 'player' },
    { id: 'elytra_movement_check',                langKey: null,                                type: 'bool', default: true,  cat: 'player' },
    { id: 'ender_pearls_vanish_on_death',         langKey: 'enderPearlsVanishOnDeath',          type: 'bool', default: true,  cat: 'player' },
    { id: 'fall_damage',                          langKey: 'fallDamage',                        type: 'bool', default: true,  cat: 'player' },
    { id: 'fire_damage',                          langKey: 'fireDamage',                        type: 'bool', default: true,  cat: 'player' },
    { id: 'freeze_damage',                        langKey: 'freezeDamage',                      type: 'bool', default: true,  cat: 'player' },
    { id: 'immediate_respawn',                    langKey: 'doImmediateRespawn',                type: 'bool', default: false, cat: 'player' },
    { id: 'keep_inventory',                       langKey: 'keepInventory',                     type: 'bool', default: false, cat: 'player' },
    { id: 'limited_crafting',                     langKey: 'doLimitedCrafting',                 type: 'bool', default: false, cat: 'player' },
    { id: 'locator_bar',                          langKey: 'locatorBar',                        type: 'bool', default: true,  cat: 'player' },
    { id: 'natural_health_regeneration',          langKey: 'naturalRegeneration',               type: 'bool', default: true,  cat: 'player' },
    { id: 'player_movement_check',                langKey: null,                                type: 'bool', default: true,  cat: 'player' },
    { id: 'players_nether_portal_creative_delay', langKey: 'playersNetherPortalCreativeDelay',  type: 'int',  default: 0,   min: 0, cat: 'player' },
    { id: 'players_nether_portal_default_delay',  langKey: 'playersNetherPortalDefaultDelay',   type: 'int',  default: 80,  min: 0, cat: 'player' },
    { id: 'players_sleeping_percentage',          langKey: 'playersSleepingPercentage',         type: 'int',  default: 100, min: 0, cat: 'player' },
    { id: 'pvp',                                  langKey: 'pvp',                               type: 'bool', default: true,  cat: 'player' },
    { id: 'respawn_radius',                       langKey: 'spawnRadius',                       type: 'int',  default: 10,  min: 0, cat: 'player' },
    { id: 'spectators_generate_chunks',           langKey: 'spectatorsGenerateChunks',          type: 'bool', default: true,  cat: 'player' },

    /* ---------- MOBS ---------- */
    { id: 'forgive_dead_players',                 langKey: 'forgiveDeadPlayers',                type: 'bool', default: true,  cat: 'mobs' },
    { id: 'max_entity_cramming',                  langKey: 'maxEntityCramming',                 type: 'int',  default: 24,  min: 0, cat: 'mobs' },
    { id: 'mob_griefing',                         langKey: 'mobGriefing',                       type: 'bool', default: true,  cat: 'mobs' },
    { id: 'raids',                                langKey: null,                                type: 'bool', default: true,  cat: 'mobs' },
    { id: 'universal_anger',                      langKey: 'universalAnger',                    type: 'bool', default: false, cat: 'mobs' },

    /* ---------- SPAWNING ---------- */
    { id: 'spawn_mobs',                           langKey: 'doMobSpawning',                     type: 'bool', default: true,  cat: 'spawning' },
    { id: 'spawn_monsters',                       langKey: 'spawnMonsters',                     type: 'bool', default: true,  cat: 'spawning' },
    { id: 'spawn_patrols',                        langKey: 'doPatrolSpawning',                  type: 'bool', default: true,  cat: 'spawning' },
    { id: 'spawn_phantoms',                       langKey: 'doInsomnia',                        type: 'bool', default: true,  cat: 'spawning' },
    { id: 'spawn_wandering_traders',              langKey: 'doTraderSpawning',                  type: 'bool', default: true,  cat: 'spawning' },
    { id: 'spawn_wardens',                        langKey: 'doWardenSpawning',                  type: 'bool', default: true,  cat: 'spawning' },

    /* ---------- DROPS ---------- */
    { id: 'block_drops',                          langKey: 'doTileDrops',                       type: 'bool', default: true,  cat: 'drops' },
    { id: 'block_explosion_drop_decay',           langKey: 'blockExplosionDropDecay',           type: 'bool', default: true,  cat: 'drops' },
    { id: 'entity_drops',                         langKey: 'doEntityDrops',                     type: 'bool', default: true,  cat: 'drops' },
    { id: 'mob_drops',                            langKey: 'doMobLoot',                         type: 'bool', default: true,  cat: 'drops' },
    { id: 'mob_explosion_drop_decay',             langKey: 'mobExplosionDropDecay',             type: 'bool', default: true,  cat: 'drops' },
    { id: 'projectiles_can_break_blocks',         langKey: 'projectilesCanBreakBlocks',         type: 'bool', default: true,  cat: 'drops' },
    { id: 'tnt_explosion_drop_decay',             langKey: 'tntExplosionDropDecay',             type: 'bool', default: false, cat: 'drops' },

    /* ---------- UPDATES ---------- */
    { id: 'advance_time',                         langKey: 'doDaylightCycle',                   type: 'bool', default: true,  cat: 'updates' },
    { id: 'advance_weather',                      langKey: 'doWeatherCycle',                    type: 'bool', default: true,  cat: 'updates' },
    { id: 'fire_spread_radius_around_player',     langKey: null,                                type: 'int',  default: 128, min: -1, cat: 'updates' },
    { id: 'lava_source_conversion',               langKey: 'lavaSourceConversion',              type: 'bool', default: false, cat: 'updates' },
    { id: 'max_snow_accumulation_height',         langKey: 'snowAccumulationHeight',            type: 'int',  default: 1,   min: 0, max: 8, cat: 'updates' },
    { id: 'random_tick_speed',                    langKey: 'randomTickSpeed',                   type: 'int',  default: 3,   min: 0, cat: 'updates' },
    { id: 'spread_vines',                         langKey: 'doVinesSpread',                     type: 'bool', default: true,  cat: 'updates' },
    { id: 'water_source_conversion',              langKey: 'waterSourceConversion',             type: 'bool', default: true,  cat: 'updates' },

    /* ---------- CHAT ---------- */
    { id: 'command_block_output',                 langKey: 'commandBlockOutput',                type: 'bool', default: true,  cat: 'chat' },
    { id: 'log_admin_commands',                   langKey: 'logAdminCommands',                  type: 'bool', default: true,  cat: 'chat' },
    { id: 'send_command_feedback',                langKey: 'sendCommandFeedback',               type: 'bool', default: true,  cat: 'chat' },
    { id: 'show_advancement_messages',            langKey: 'announceAdvancements',              type: 'bool', default: true,  cat: 'chat' },
    { id: 'show_death_messages',                  langKey: 'showDeathMessages',                 type: 'bool', default: true,  cat: 'chat' },

    /* ---------- MISC ---------- */
    { id: 'allow_entering_nether_using_portals',  langKey: 'allowEnteringNetherUsingPortals',   type: 'bool', default: true,  cat: 'misc' },
    { id: 'command_blocks_work',                  langKey: 'commandBlocksEnabled',              type: 'bool', default: true,  cat: 'misc' },
    { id: 'global_sound_events',                  langKey: 'globalSoundEvents',                 type: 'bool', default: true,  cat: 'misc' },
    { id: 'max_block_modifications',              langKey: 'commandModificationBlockLimit',     type: 'int',  default: 32768, min: 1, cat: 'misc' },
    { id: 'max_command_forks',                    langKey: 'maxCommandForkCount',               type: 'int',  default: 65536, min: 0, cat: 'misc' },
    { id: 'max_command_sequence_length',          langKey: 'maxCommandChainLength',             type: 'int',  default: 65536, min: 0, cat: 'misc' },
    { id: 'max_minecart_speed',                   langKey: 'minecartMaxSpeed',                  type: 'int',  default: 8,   min: 1, max: 1000,
      cat: 'misc', feature: 'minecart_improvements' },
    { id: 'reduced_debug_info',                   langKey: 'reducedDebugInfo',                  type: 'bool', default: false, cat: 'misc' },
    { id: 'spawner_blocks_work',                  langKey: 'spawnerBlocksEnabled',              type: 'bool', default: true,  cat: 'misc' },
    { id: 'tnt_explodes',                         langKey: 'tntExplodes',                       type: 'bool', default: true,  cat: 'misc' }
  ];

  /* 分类显示顺序 */
  window.__mcGameRuleCategories = [
    'chat', 'drops', 'misc', 'mobs', 'player', 'spawning', 'updates'
  ];

})();