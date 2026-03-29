import React from 'react';
import { Plus } from 'lucide-react';

interface Story {
  id: string;
  name: string;
  photo: string;
  active: boolean;
}

interface StorySectionProps {
  stories: Story[];
}

export default function StorySection({ stories }: StorySectionProps) {
  return (
    <section className="px-6 py-4 overflow-x-auto flex items-center gap-6 no-scrollbar">
      {/* My Story */}
      <div className="flex flex-col items-center gap-2 flex-shrink-0">
        <div className="relative">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center border-2 border-dashed border-primary/30 hover:border-primary/50 transition-all cursor-pointer group">
            <Plus size={24} className="text-primary group-hover:scale-110 transition-transform" />
          </div>
        </div>
        <span className="text-xs font-semibold text-text">Your Story</span>
      </div>

      {/* Other Stories */}
      {stories.map((story) => (
        <div key={story.id} className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group">
          <div className="relative p-[3px] rounded-full bg-gradient-to-tr from-primary to-secondary shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform duration-300">
            <div className="p-[2px] bg-white rounded-full">
              <img
                src={story.photo}
                alt={story.name}
                className="w-14 h-14 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            {story.active && (
              <div className="absolute bottom-0 right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          <span className="text-[11px] font-bold text-muted truncate w-16 text-center group-hover:text-text transition-colors">{story.name}</span>
        </div>
      ))}
    </section>
  );
}
