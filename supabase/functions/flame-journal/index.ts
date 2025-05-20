
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const { entryType, content, tags, metadata } = await req.json();
    
    // Ensure tags is always an array even if it's null/undefined
    const normalizedTags = Array.isArray(tags) ? tags : [];
    
    console.log(`Creating ${entryType} journal entry with tags:`, normalizedTags);
    console.log('Entry metadata:', metadata);
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Create the journal entry
    const { data, error } = await supabase
      .from('flamejournal')
      .insert({
        entry_type: entryType || 'thought',
        content,
        tags: normalizedTags,
        metadata: metadata || {}
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error inserting journal entry:", error);
      throw error;
    }
    
    // If this is a task-related entry, ensure the task is properly saved in the tasks table
    if (entryType?.includes('task_') && metadata?.taskId) {
      console.log("Task-related entry detected, ensuring task is saved to database");
      try {
        // Check if the task exists in the tasks table
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select()
          .eq('id', metadata.taskId)
          .maybeSingle();
        
        if (taskError) {
          console.error("Error checking task existence:", taskError);
        } else if (!taskData) {
          console.log("Task not found in database. Attempting to save it now.");
          
          // If metadata contains enough information, we can save the task
          if (metadata.taskTitle && metadata.taskStatus) {
            const taskToSave = {
              id: metadata.taskId,
              title: metadata.taskTitle,
              status: metadata.taskStatus,
              tags: metadata.taskTags || [],
              related_file: metadata.relatedFile,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            console.log("Saving task to database:", taskToSave);
            
            const { data: savedTask, error: saveError } = await supabase
              .from('tasks')
              .upsert(taskToSave)
              .select();
              
            if (saveError) {
              console.error("Error saving task from journal entry:", saveError);
            } else {
              console.log("Successfully saved task from journal entry:", savedTask);
            }
          } else {
            console.error("Insufficient task data in metadata to create task record:", 
              JSON.stringify({
                hasTitle: Boolean(metadata.taskTitle),
                hasStatus: Boolean(metadata.taskStatus),
                metadata
              })
            );
          }
        } else {
          console.log("Task found in database:", taskData);
        }
      } catch (taskError) {
        console.error("Error handling task verification:", taskError);
      }
    }
    
    // Return the created entry
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating journal entry:", error);
    
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
