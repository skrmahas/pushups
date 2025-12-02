-- EXPANSION MIGRATION: Multi-Exercise Support, Workout Plans, Social Features
-- Run this AFTER the base schema is in place

-- ============================================
-- NEW TABLES
-- ============================================

-- Exercise Types (pushups, pullups)
CREATE TABLE IF NOT EXISTS exercise_types (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  goal_amount int NOT NULL DEFAULT 100,
  icon text,
  created_at timestamp with time zone DEFAULT now()
);

-- Insert default exercise types
INSERT INTO exercise_types (id, name, description, goal_amount, icon) VALUES
  ('pushups', 'Push-ups', 'Upper body pushing exercise targeting chest, shoulders, and triceps', 100, '💪'),
  ('pullups', 'Pull-ups', 'Upper body pulling exercise targeting back, biceps, and core', 50, '🏋️')
ON CONFLICT (id) DO NOTHING;

-- Workout Plans
CREATE TABLE IF NOT EXISTS workout_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exercise_type text REFERENCES exercise_types(id) NOT NULL,
  intensity text NOT NULL DEFAULT 'intermediate', -- beginner, intermediate, advanced
  timeline_months int NOT NULL DEFAULT 3,
  target_goal int NOT NULL,
  starting_max_reps int,
  total_days int NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Plan Days (daily workout structure)
CREATE TABLE IF NOT EXISTS plan_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES workout_plans(id) ON DELETE CASCADE NOT NULL,
  day_number int NOT NULL,
  is_rest_day boolean DEFAULT false,
  target_total_reps int NOT NULL DEFAULT 0,
  recommended_sets jsonb NOT NULL DEFAULT '[]', -- Array of rep counts, e.g., [20, 20, 20, 20, 20]
  notes text,
  UNIQUE(plan_id, day_number)
);

-- Exercise Variation Info (detailed info for tutorial modals)
CREATE TABLE IF NOT EXISTS exercise_variations_info (
  id text PRIMARY KEY, -- matches variation id from gamification.ts
  exercise_type text REFERENCES exercise_types(id) NOT NULL,
  name text NOT NULL,
  difficulty text NOT NULL, -- easy, normal, hard, extreme
  description text NOT NULL,
  muscles_targeted text[] NOT NULL DEFAULT '{}',
  form_tips text[] NOT NULL DEFAULT '{}',
  common_mistakes text[] NOT NULL DEFAULT '{}',
  video_url text,
  thumbnail_url text,
  created_at timestamp with time zone DEFAULT now()
);

-- Workout Comments
CREATE TABLE IF NOT EXISTS workout_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Workout Likes
CREATE TABLE IF NOT EXISTS workout_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id uuid REFERENCES workouts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(workout_id, user_id)
);

-- User Onboarding (tracks questionnaire answers)
CREATE TABLE IF NOT EXISTS user_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  exercise_type text REFERENCES exercise_types(id),
  intensity text,
  timeline_months int,
  max_reps int,
  fitness_level text, -- beginner, some_experience, intermediate, advanced
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- UPDATE EXISTING TABLES
-- ============================================

-- Add new columns to profiles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='exercise_type') THEN
        ALTER TABLE profiles ADD COLUMN exercise_type text REFERENCES exercise_types(id) DEFAULT 'pushups';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='current_plan_id') THEN
        ALTER TABLE profiles ADD COLUMN current_plan_id uuid REFERENCES workout_plans(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='onboarding_completed') THEN
        ALTER TABLE profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='current_plan_day') THEN
        ALTER TABLE profiles ADD COLUMN current_plan_day int DEFAULT 1;
    END IF;
END $$;

-- Add new columns to workouts
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='exercise_type') THEN
        ALTER TABLE workouts ADD COLUMN exercise_type text REFERENCES exercise_types(id) DEFAULT 'pushups';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='plan_day') THEN
        ALTER TABLE workouts ADD COLUMN plan_day int;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='is_daily_goal_completed') THEN
        ALTER TABLE workouts ADD COLUMN is_daily_goal_completed boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='privacy') THEN
        ALTER TABLE workouts ADD COLUMN privacy text DEFAULT 'friends'; -- public, friends, private
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workouts' AND column_name='daily_goal_bonus_xp') THEN
        ALTER TABLE workouts ADD COLUMN daily_goal_bonus_xp int DEFAULT 0;
    END IF;
END $$;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE exercise_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_variations_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

-- Exercise types (public read)
CREATE POLICY "Anyone can view exercise types" ON exercise_types FOR SELECT USING (true);

-- Workout plans
CREATE POLICY "Users can view their own workout plans" ON workout_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own workout plans" ON workout_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own workout plans" ON workout_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own workout plans" ON workout_plans FOR DELETE USING (auth.uid() = user_id);

-- Plan days
CREATE POLICY "Users can view plan days for their plans" ON plan_days FOR SELECT USING (
  EXISTS (SELECT 1 FROM workout_plans WHERE workout_plans.id = plan_days.plan_id AND workout_plans.user_id = auth.uid())
);
CREATE POLICY "Users can insert plan days for their plans" ON plan_days FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM workout_plans WHERE workout_plans.id = plan_days.plan_id AND workout_plans.user_id = auth.uid())
);

-- Exercise variations info (public read)
CREATE POLICY "Anyone can view exercise variation info" ON exercise_variations_info FOR SELECT USING (true);

-- Workout comments
CREATE POLICY "Users can view comments on accessible workouts" ON workout_comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM workouts w
    WHERE w.id = workout_comments.workout_id
    AND (
      w.privacy = 'public'
      OR w.user_id = auth.uid()
      OR (w.privacy = 'friends' AND EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.status = 'accepted'
        AND ((f.user_id = auth.uid() AND f.friend_id = w.user_id) OR (f.friend_id = auth.uid() AND f.user_id = w.user_id))
      ))
    )
  )
);
CREATE POLICY "Users can add comments" ON workout_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON workout_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON workout_comments FOR DELETE USING (auth.uid() = user_id);

-- Workout likes
CREATE POLICY "Users can view likes on accessible workouts" ON workout_likes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM workouts w
    WHERE w.id = workout_likes.workout_id
    AND (
      w.privacy = 'public'
      OR w.user_id = auth.uid()
      OR (w.privacy = 'friends' AND EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.status = 'accepted'
        AND ((f.user_id = auth.uid() AND f.friend_id = w.user_id) OR (f.friend_id = auth.uid() AND f.user_id = w.user_id))
      ))
    )
  )
);
CREATE POLICY "Users can like workouts" ON workout_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike workouts" ON workout_likes FOR DELETE USING (auth.uid() = user_id);

-- User onboarding
CREATE POLICY "Users can view their own onboarding" ON user_onboarding FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own onboarding" ON user_onboarding FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own onboarding" ON user_onboarding FOR UPDATE USING (auth.uid() = user_id);

-- Update workouts policy for privacy
DROP POLICY IF EXISTS "Friends can view workout summaries" ON workouts;
CREATE POLICY "Users can view public workouts" ON workouts FOR SELECT USING (
  auth.uid() = user_id
  OR privacy = 'public'
  OR (privacy = 'friends' AND EXISTS (
    SELECT 1 FROM friendships f
    WHERE f.status = 'accepted'
    AND ((f.user_id = auth.uid() AND f.friend_id = workouts.user_id) OR (f.friend_id = auth.uid() AND f.user_id = workouts.user_id))
  ))
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_workout_plans_user_id ON workout_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_days_plan_id ON plan_days(plan_id);
CREATE INDEX IF NOT EXISTS idx_workout_comments_workout_id ON workout_comments(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_likes_workout_id ON workout_likes(workout_id);
CREATE INDEX IF NOT EXISTS idx_workouts_privacy ON workouts(privacy);
CREATE INDEX IF NOT EXISTS idx_workouts_exercise_type ON workouts(exercise_type);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding(user_id);

-- ============================================
-- INSERT EXERCISE VARIATION INFO
-- ============================================

-- Pushup variations info
INSERT INTO exercise_variations_info (id, exercise_type, name, difficulty, description, muscles_targeted, form_tips, common_mistakes, video_url) VALUES
-- Easy pushups
('wall', 'pushups', 'Wall Push-up', 'easy', 
  'A beginner-friendly push-up performed against a wall. Perfect for building initial strength and learning proper form.',
  ARRAY['Chest', 'Shoulders', 'Triceps'],
  ARRAY['Stand arm''s length from the wall', 'Keep your body in a straight line', 'Lower chest toward the wall with control', 'Push back to starting position'],
  ARRAY['Standing too close to the wall', 'Letting hips sag', 'Not going through full range of motion'],
  'https://www.youtube.com/watch?v=a6YHbXD2XlU'),

('knee', 'pushups', 'Knee Push-up', 'easy',
  'A modified push-up performed on your knees. Great stepping stone to full push-ups while building chest and arm strength.',
  ARRAY['Chest', 'Shoulders', 'Triceps', 'Core'],
  ARRAY['Place knees on a mat for comfort', 'Keep hips in line with shoulders', 'Lower chest to just above the ground', 'Maintain a straight line from knees to head'],
  ARRAY['Hips too high or too low', 'Not engaging core', 'Rushing through reps'],
  'https://www.youtube.com/watch?v=jWxvty2KROs'),

('incline', 'pushups', 'Incline Push-up', 'easy',
  'Push-up with hands elevated on a bench, step, or sturdy surface. Easier than standard push-ups but harder than wall push-ups.',
  ARRAY['Chest', 'Shoulders', 'Triceps', 'Core'],
  ARRAY['Use a stable elevated surface', 'Keep core tight throughout', 'Lower chest toward the surface', 'The higher the surface, the easier the exercise'],
  ARRAY['Using an unstable surface', 'Flaring elbows too wide', 'Not going low enough'],
  'https://www.youtube.com/watch?v=cfns5VDVVvk'),

-- Normal pushups
('standard', 'pushups', 'Standard Push-up', 'normal',
  'The classic push-up. A fundamental bodyweight exercise that builds upper body strength and core stability.',
  ARRAY['Chest', 'Shoulders', 'Triceps', 'Core', 'Serratus Anterior'],
  ARRAY['Hands slightly wider than shoulder-width', 'Keep body in a straight line', 'Lower until chest nearly touches ground', 'Push through palms to return'],
  ARRAY['Hips sagging or piking up', 'Not going through full range', 'Holding breath', 'Elbows flaring at 90 degrees'],
  'https://www.youtube.com/watch?v=IODxDxX7oi4'),

('wide', 'pushups', 'Wide Push-up', 'normal',
  'Push-up with hands placed wider than shoulder-width. Emphasizes chest muscles more than standard push-ups.',
  ARRAY['Chest (emphasis)', 'Shoulders', 'Triceps'],
  ARRAY['Place hands 1.5x shoulder width apart', 'Point fingers slightly outward', 'Keep elbows tracking over wrists', 'Focus on chest squeeze at top'],
  ARRAY['Going too wide causing shoulder strain', 'Letting elbows flare back', 'Shallow range of motion'],
  'https://www.youtube.com/watch?v=pfohwJKq4e0'),

('diamond', 'pushups', 'Diamond Push-up', 'normal',
  'Push-up with hands close together forming a diamond shape. Heavily targets triceps and inner chest.',
  ARRAY['Triceps (emphasis)', 'Inner Chest', 'Shoulders'],
  ARRAY['Form diamond shape with thumbs and index fingers', 'Keep elbows close to body', 'Lower chest to hands', 'Push through triceps'],
  ARRAY['Hands too far forward', 'Flaring elbows out', 'Not keeping core engaged'],
  'https://www.youtube.com/watch?v=J0DnG1_S92I'),

('close', 'pushups', 'Close-Grip Push-up', 'normal',
  'Push-up with hands placed close together, targeting triceps more than standard push-ups.',
  ARRAY['Triceps', 'Chest', 'Shoulders'],
  ARRAY['Place hands directly under shoulders or closer', 'Keep elbows tight to body', 'Lower with control', 'Push through triceps'],
  ARRAY['Hands too far apart', 'Elbows flaring out', 'Rushing the movement'],
  'https://www.youtube.com/watch?v=CWkkV3Xt45c'),

-- Hard pushups
('decline', 'pushups', 'Decline Push-up', 'hard',
  'Push-up with feet elevated on a bench or box. Increases difficulty and shifts focus to upper chest and shoulders.',
  ARRAY['Upper Chest', 'Shoulders (emphasis)', 'Triceps', 'Core'],
  ARRAY['Place feet on stable elevated surface', 'Keep body straight from head to heels', 'Lower chest toward ground', 'The higher the feet, the harder it gets'],
  ARRAY['Hips piking up', 'Not maintaining straight body line', 'Going too high too soon'],
  'https://www.youtube.com/watch?v=SKPab2YC8BE'),

('staggered', 'pushups', 'Staggered Push-up', 'hard',
  'Push-up with one hand forward and one back. Builds unilateral strength and prepares for one-arm push-ups.',
  ARRAY['Chest', 'Shoulders', 'Triceps', 'Core', 'Obliques'],
  ARRAY['Stagger hands by 6-12 inches', 'Keep core extra tight', 'Alternate which hand is forward', 'Control the rotation tendency'],
  ARRAY['Hands not staggered enough', 'Letting body rotate', 'Not alternating sides equally'],
  'https://www.youtube.com/watch?v=0RUm9LS7i3k'),

('archer', 'pushups', 'Archer Push-up', 'hard',
  'Push-up where one arm extends to the side while the other does the work. Excellent for building single-arm strength.',
  ARRAY['Chest', 'Shoulders', 'Triceps', 'Core'],
  ARRAY['Start in wide push-up position', 'Shift weight to one arm and lower', 'Keep extended arm straight', 'Push back up and alternate'],
  ARRAY['Not shifting weight properly', 'Bending the extended arm', 'Not going low enough on working arm'],
  'https://www.youtube.com/watch?v=Ky9t4ZqvaEM'),

('weighted', 'pushups', 'Weighted Push-up', 'hard',
  'Standard push-up with added weight on your back. Use a weight vest or have a partner place a plate on your upper back.',
  ARRAY['Chest', 'Shoulders', 'Triceps', 'Core'],
  ARRAY['Start with 10-20% of bodyweight', 'Maintain perfect standard push-up form', 'Use a weight vest for convenience', 'Progress weight slowly'],
  ARRAY['Adding too much weight too soon', 'Compromising form for weight', 'Weight sliding during movement'],
  'https://www.youtube.com/watch?v=mGvBsNyl_eA'),

-- Extreme pushups
('explosive', 'pushups', 'Explosive Push-up', 'extreme',
  'Powerful push-up where you push off the ground explosively. Builds power and fast-twitch muscle fibers.',
  ARRAY['Chest', 'Shoulders', 'Triceps', 'Core', 'Fast-twitch muscles'],
  ARRAY['Lower with control', 'Explode up powerfully', 'Hands should leave the ground', 'Land softly and absorb impact'],
  ARRAY['Not generating enough power', 'Landing too hard', 'Losing form on landing'],
  'https://www.youtube.com/watch?v=Bcl9-HZXWP8'),

('clap', 'pushups', 'Clap Push-up', 'extreme',
  'Explosive push-up with a clap at the top. Requires significant power and coordination.',
  ARRAY['Chest', 'Shoulders', 'Triceps', 'Core', 'Explosive Power'],
  ARRAY['Master explosive push-ups first', 'Generate maximum power on push', 'Clap quickly and return hands', 'Land with slightly bent elbows'],
  ARRAY['Not enough height for clap', 'Landing with locked elbows', 'Losing core engagement'],
  'https://www.youtube.com/watch?v=EYwWCgM198U'),

('one_arm', 'pushups', 'One-Arm Push-up', 'extreme',
  'The ultimate push-up variation. Perform a full push-up using only one arm while maintaining balance.',
  ARRAY['Chest', 'Shoulders', 'Triceps', 'Core', 'Obliques', 'Full Body Stability'],
  ARRAY['Widen stance for balance', 'Place working hand under chest', 'Keep hips as square as possible', 'Lower with control'],
  ARRAY['Hips rotating too much', 'Not strong enough to attempt', 'Hand placement too far out'],
  'https://www.youtube.com/watch?v=N8-lB4nCj1A'),

('planche', 'pushups', 'Planche Push-up', 'extreme',
  'Advanced push-up performed with feet off the ground in a planche position. Requires years of training.',
  ARRAY['Shoulders', 'Chest', 'Triceps', 'Core', 'Lower Back', 'Full Body'],
  ARRAY['Master tuck planche first', 'Build tremendous shoulder strength', 'Progress through planche variations', 'Train wrist conditioning'],
  ARRAY['Attempting without prerequisites', 'Not building proper progressions', 'Neglecting wrist preparation'],
  'https://www.youtube.com/watch?v=YrX6K0z3e7o'),

-- Pull-up variations - Easy
('band_assisted', 'pullups', 'Band-Assisted Pull-up', 'easy',
  'Pull-up with a resistance band to reduce body weight. Perfect for beginners building toward unassisted pull-ups.',
  ARRAY['Latissimus Dorsi', 'Biceps', 'Rhomboids', 'Rear Deltoids'],
  ARRAY['Loop band around bar and under knee or foot', 'Use thicker bands for more assistance', 'Focus on full range of motion', 'Progress to thinner bands over time'],
  ARRAY['Using too thick of a band', 'Not going through full range', 'Kipping or swinging'],
  'https://www.youtube.com/watch?v=D5749F4EHpk'),

('negative', 'pullups', 'Negative Pull-up', 'easy',
  'Focus on the lowering (eccentric) phase of the pull-up. Jump or step up, then lower yourself slowly.',
  ARRAY['Latissimus Dorsi', 'Biceps', 'Forearms', 'Core'],
  ARRAY['Jump or step to top position', 'Lower yourself for 3-5 seconds', 'Control the entire descent', 'Reset and repeat'],
  ARRAY['Dropping too fast', 'Not starting at full top position', 'Doing too many and overtraining'],
  'https://www.youtube.com/watch?v=gbPURTSxQLY'),

('australian', 'pullups', 'Australian Pull-up (Body Row)', 'easy',
  'Horizontal pulling exercise using a low bar. Also called inverted row or body row.',
  ARRAY['Upper Back', 'Rear Deltoids', 'Biceps', 'Core'],
  ARRAY['Set bar at waist height', 'Keep body straight like a plank', 'Pull chest to bar', 'Lower with control'],
  ARRAY['Hips sagging', 'Not pulling high enough', 'Using momentum'],
  'https://www.youtube.com/watch?v=XZV9IwluPjw'),

-- Pull-up variations - Normal
('standard_pullup', 'pullups', 'Standard Pull-up', 'normal',
  'The classic pull-up with overhand grip. Fundamental exercise for building back and arm strength.',
  ARRAY['Latissimus Dorsi', 'Biceps', 'Rhomboids', 'Rear Deltoids', 'Core'],
  ARRAY['Grip bar slightly wider than shoulders', 'Hang with arms fully extended', 'Pull until chin clears bar', 'Lower with control'],
  ARRAY['Not going through full range', 'Kipping or swinging', 'Shrugging shoulders'],
  'https://www.youtube.com/watch?v=eGo4IYlbE5g'),

('wide_grip', 'pullups', 'Wide-Grip Pull-up', 'normal',
  'Pull-up with hands placed wider than shoulder width. Greater emphasis on lats and creates a wider back.',
  ARRAY['Latissimus Dorsi (emphasis)', 'Teres Major', 'Rear Deltoids'],
  ARRAY['Grip bar 1.5x shoulder width', 'Focus on pulling elbows down', 'Squeeze shoulder blades together', 'Full dead hang at bottom'],
  ARRAY['Going too wide causing shoulder strain', 'Not retracting shoulder blades', 'Short range of motion'],
  'https://www.youtube.com/watch?v=CfJd_s4xHdc'),

('close_grip_pullup', 'pullups', 'Close-Grip Pull-up', 'normal',
  'Pull-up with hands close together, typically using a neutral or underhand grip. More bicep involvement.',
  ARRAY['Biceps (emphasis)', 'Latissimus Dorsi', 'Brachialis'],
  ARRAY['Grip bar with hands 6-8 inches apart', 'Keep elbows tight to body', 'Pull chin over bar', 'Control the negative'],
  ARRAY['Hands too close causing wrist strain', 'Swinging body', 'Not full extension at bottom'],
  'https://www.youtube.com/watch?v=_AF2nxPiZyE'),

('neutral_grip', 'pullups', 'Neutral-Grip Pull-up', 'normal',
  'Pull-up with palms facing each other. Often easier on shoulders and elbows while still building strength.',
  ARRAY['Latissimus Dorsi', 'Biceps', 'Brachialis', 'Forearms'],
  ARRAY['Use parallel handles or neutral grip bar', 'Keep elbows tracking forward', 'Full range of motion', 'Great for shoulder issues'],
  ARRAY['Not going to full dead hang', 'Rushing reps', 'Not engaging back properly'],
  'https://www.youtube.com/watch?v=GIe1CjQZ1jw'),

-- Pull-up variations - Hard
('weighted_pullup', 'pullups', 'Weighted Pull-up', 'hard',
  'Pull-up with added weight using a dip belt, weight vest, or dumbbell between feet.',
  ARRAY['Latissimus Dorsi', 'Biceps', 'Rhomboids', 'Core', 'Grip'],
  ARRAY['Start with 5-10 lbs added', 'Maintain perfect form', 'Progress weight slowly', 'Use a dip belt for best results'],
  ARRAY['Adding too much weight too soon', 'Sacrificing range of motion', 'Kipping with added weight'],
  'https://www.youtube.com/watch?v=vw5rWjgwI8g'),

('archer_pullup', 'pullups', 'Archer Pull-up', 'hard',
  'Pull-up where one arm does most of the work while the other arm extends to the side.',
  ARRAY['Latissimus Dorsi', 'Biceps', 'Core', 'Obliques'],
  ARRAY['Start with wide grip', 'Pull to one hand while extending other arm', 'Alternate sides', 'Progress from assisted archer'],
  ARRAY['Not shifting weight properly', 'Letting extended arm bend', 'Not alternating evenly'],
  'https://www.youtube.com/watch?v=Zd6OX3O9IoY'),

('typewriter', 'pullups', 'Typewriter Pull-up', 'hard',
  'Pull up to the bar then move side to side while staying at the top. Builds lateral strength.',
  ARRAY['Latissimus Dorsi', 'Biceps', 'Shoulders', 'Core'],
  ARRAY['Pull chin over bar', 'Shift side to side at top', 'Keep chin over bar throughout', 'Control the movement'],
  ARRAY['Dropping too low during shifts', 'Moving too fast', 'Not enough reps per side'],
  'https://www.youtube.com/watch?v=C4y3IVDzQ1I'),

('muscle_up_progression', 'pullups', 'Muscle-up Progression', 'hard',
  'Explosive pull-up transitioning over the bar. A combination of a pull-up and a dip.',
  ARRAY['Latissimus Dorsi', 'Chest', 'Triceps', 'Shoulders', 'Core'],
  ARRAY['Master explosive pull-ups first', 'Practice the transition on low bar', 'Pull hips to bar, not chin', 'Lean over bar to complete'],
  ARRAY['Not enough explosive power', 'Pulling too vertically', 'Not leaning forward at transition'],
  'https://www.youtube.com/watch?v=cAy5VBXFJCU'),

-- Pull-up variations - Extreme
('one_arm_progression', 'pullups', 'One-Arm Pull-up Progression', 'extreme',
  'Working toward the one-arm pull-up using assisted variations and negatives.',
  ARRAY['Latissimus Dorsi', 'Biceps', 'Forearms', 'Core', 'Full Body'],
  ARRAY['Start with one arm negatives', 'Use towel assist variations', 'Progress to assisted one arm', 'Build incredible grip strength'],
  ARRAY['Attempting too soon', 'Not building proper foundation', 'Neglecting elbow conditioning'],
  'https://www.youtube.com/watch?v=aFiBwT3H_NU'),

('clapping_pullup', 'pullups', 'Clapping Pull-up', 'extreme',
  'Explosive pull-up with enough height to clap hands at the top before catching the bar.',
  ARRAY['Latissimus Dorsi', 'Biceps', 'Explosive Power', 'Grip', 'Core'],
  ARRAY['Master explosive pull-ups first', 'Generate maximum upward force', 'Clap quickly and re-grip', 'Start with small claps'],
  ARRAY['Not enough height', 'Missing the bar on way down', 'Attempting without prerequisite strength'],
  'https://www.youtube.com/watch?v=fTFVT2P9nRY'),

('explosive_pullup', 'pullups', 'Explosive Pull-up', 'extreme',
  'Powerful pull-up with maximum acceleration. Hands may leave the bar at the top.',
  ARRAY['Latissimus Dorsi', 'Biceps', 'Fast-twitch Muscles', 'Core'],
  ARRAY['Start from dead hang', 'Pull as fast and hard as possible', 'Aim to pull chest to bar', 'Control the descent'],
  ARRAY['Not generating enough power', 'Poor grip strength', 'Losing control on descent'],
  'https://www.youtube.com/watch?v=FgRZPSY6Wjw')

ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  muscles_targeted = EXCLUDED.muscles_targeted,
  form_tips = EXCLUDED.form_tips,
  common_mistakes = EXCLUDED.common_mistakes,
  video_url = EXCLUDED.video_url;

