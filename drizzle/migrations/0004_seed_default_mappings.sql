-- Seed default mappings
INSERT INTO `model_mappings` (`source_name`, `source_protocol`, `priority`, `target_name`, `target_method`)
VALUES
('__DEFAULT__', 'openai', 0, 'gemini-1.5-flash-latest', 'generateContent'),
('gpt-3.5-turbo', 'openai', 10, 'gemini-1.5-pro-latest', 'streamGenerateContent'),
('__DEFAULT__', 'anthropic', 0, 'gemini-1.5-flash-latest', 'streamGenerateContent');
