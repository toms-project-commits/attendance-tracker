-- Migration: Shared Attendance System (Follow Requests)
-- Description: Add tables and RLS policies for users to share attendance with friends
-- Like Instagram follow requests - users can request to follow, and others can accept/reject

-- Create friendship_requests table
CREATE TABLE IF NOT EXISTS public.friendship_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, recipient_id),
  CHECK (requester_id != recipient_id)
);

-- Create friendships table (accepted friendships)
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id),
  CHECK (user_id != friend_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_friendship_requests_requester 
  ON public.friendship_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendship_requests_recipient 
  ON public.friendship_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_friendship_requests_status 
  ON public.friendship_requests(status);
CREATE INDEX IF NOT EXISTS idx_friendships_user 
  ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend 
  ON public.friendships(friend_id);

-- RLS Policies for friendship_requests
ALTER TABLE public.friendship_requests ENABLE ROW LEVEL SECURITY;

-- Users can view requests they sent or received
CREATE POLICY "Users can view their own friendship requests"
  ON public.friendship_requests FOR SELECT
  USING (
    auth.uid() = requester_id OR auth.uid() = recipient_id
  );

-- Users can send friendship requests
CREATE POLICY "Users can send friendship requests"
  ON public.friendship_requests FOR INSERT
  WITH CHECK (
    auth.uid() = requester_id AND
    requester_id != recipient_id
  );

-- Users can update requests they received (accept/reject)
CREATE POLICY "Users can update requests they received"
  ON public.friendship_requests FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Users can delete requests they sent
CREATE POLICY "Users can delete requests they sent"
  ON public.friendship_requests FOR DELETE
  USING (auth.uid() = requester_id);

-- RLS Policies for friendships
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Users can view their friendships
CREATE POLICY "Users can view their friendships"
  ON public.friendships FOR SELECT
  USING (
    auth.uid() = user_id OR auth.uid() = friend_id
  );

-- Friendships are created by trigger, not directly
CREATE POLICY "Friendships created by trigger"
  ON public.friendships FOR INSERT
  WITH CHECK (false); -- Prevent direct inserts

-- Users can delete their friendships (unfriend)
CREATE POLICY "Users can delete their friendships"
  ON public.friendships FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Function to create bi-directional friendship when request is accepted
CREATE OR REPLACE FUNCTION public.handle_friendship_request_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If request is accepted, create bi-directional friendship
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Insert friendship from requester to recipient
    INSERT INTO public.friendships (user_id, friend_id)
    VALUES (NEW.requester_id, NEW.recipient_id)
    ON CONFLICT (user_id, friend_id) DO NOTHING;
    
    -- Insert friendship from recipient to requester
    INSERT INTO public.friendships (user_id, friend_id)
    VALUES (NEW.recipient_id, NEW.requester_id)
    ON CONFLICT (user_id, friend_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create friendship when request is accepted
DROP TRIGGER IF EXISTS on_friendship_request_accepted ON public.friendship_requests;
CREATE TRIGGER on_friendship_request_accepted
  AFTER UPDATE ON public.friendship_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_friendship_request_update();

-- Function to clean up friendship when unfriending
CREATE OR REPLACE FUNCTION public.handle_friendship_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete the reverse friendship as well
  DELETE FROM public.friendships
  WHERE (user_id = OLD.friend_id AND friend_id = OLD.user_id);
  
  -- Also delete any pending requests between these users
  DELETE FROM public.friendship_requests
  WHERE (requester_id = OLD.user_id AND recipient_id = OLD.friend_id)
     OR (requester_id = OLD.friend_id AND recipient_id = OLD.user_id);
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to handle unfriending
DROP TRIGGER IF EXISTS on_friendship_deleted ON public.friendships;
CREATE TRIGGER on_friendship_deleted
  BEFORE DELETE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_friendship_deletion();

-- Add search capability: Update profiles table to make username searchable
CREATE INDEX IF NOT EXISTS idx_profiles_username_search 
  ON public.profiles USING gin(to_tsvector('english', username));

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendship_requests TO authenticated;
GRANT SELECT, DELETE ON public.friendships TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create view for easy friend lookup with profile info
CREATE OR REPLACE VIEW public.friends_with_profiles AS
SELECT 
  f.user_id,
  f.friend_id,
  p.username AS friend_username,
  p.full_name AS friend_full_name,
  p.created_at AS friend_since
FROM public.friendships f
JOIN public.profiles p ON f.friend_id = p.id;

-- Grant access to view
GRANT SELECT ON public.friends_with_profiles TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE public.friendship_requests IS 'Stores friendship requests between users - pending, accepted, or rejected';
COMMENT ON TABLE public.friendships IS 'Stores bi-directional friendships between users';
COMMENT ON VIEW public.friends_with_profiles IS 'View combining friendships with friend profile information';
