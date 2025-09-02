import React from 'react'
import { Icon, KitIcon } from '@/components/ui/icon'
import { getKitIconData, PNG_ASSETS } from '@/lib/icons'

/**
 * Demo page showcasing the enhanced icon system with PNG assets
 * This demonstrates both emoji fallbacks and high-quality PNG icons
 */
export default function IconDemo() {
  const kitTypes = ['hazzy', 'fullkit', 'meds', 'bolty', 'teas', 'roadsign', 'coffee']
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-orange-300 mb-8">
          Enhanced Icon System Demo
        </h1>
        
        {/* PNG Assets Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-orange-300 mb-4">
            PNG Assets
          </h2>
          <div className="grid grid-cols-5 gap-4 p-4 bg-gray-800 rounded-lg">
            {Object.entries(PNG_ASSETS).map(([key, src]) => (
              <div key={key} className="text-center">
                <img 
                  src={src} 
                  alt={key} 
                  className="w-12 h-12 mx-auto mb-2 object-contain"
                />
                <p className="text-xs text-gray-300">{key}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Kit Icons with PNG Support */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-orange-300 mb-4">
            Kit Icons (Enhanced)
          </h2>
          <div className="grid grid-cols-7 gap-4 p-4 bg-gray-800 rounded-lg">
            {kitTypes.map((kitType) => {
              const iconData = getKitIconData(kitType)
              return (
                <div key={kitType} className="text-center">
                  <div className="mb-2">
                    <KitIcon kitType={kitType} size="lg" />
                  </div>
                  <p className="text-xs text-gray-300 capitalize">{kitType}</p>
                  <div className="text-xs text-gray-500 mt-1">
                    {iconData.png ? 'PNG' : 'Emoji'}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Size Demonstrations */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-orange-300 mb-4">
            Size Variations
          </h2>
          <div className="space-y-4 p-4 bg-gray-800 rounded-lg">
            {['xs', 'sm', 'md', 'lg', 'xl'].map((size) => (
              <div key={size} className="flex items-center gap-4">
                <span className="w-8 text-gray-300 text-sm">{size}:</span>
                <KitIcon kitType="hazzy" size={size as any} />
                <KitIcon kitType="bolty" size={size as any} />
                <KitIcon kitType="meds" size={size as any} />
                <KitIcon kitType="teas" size={size as any} />
              </div>
            ))}
          </div>
        </section>

        {/* Comparison: PNG vs Emoji */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-orange-300 mb-4">
            PNG vs Emoji Comparison
          </h2>
          <div className="grid grid-cols-2 gap-6">
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-lg font-medium text-gray-200 mb-4">PNG Icons</h3>
              <div className="space-y-3">
                {['hazzy', 'bolty', 'meds', 'teas'].map((kitType) => (
                  <div key={kitType} className="flex items-center gap-3">
                    <KitIcon kitType={kitType} size="md" preferPng={true} />
                    <span className="text-gray-300 capitalize">{kitType}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-4 bg-gray-800 rounded-lg">
              <h3 className="text-lg font-medium text-gray-200 mb-4">Emoji Fallbacks</h3>
              <div className="space-y-3">
                {['hazzy', 'bolty', 'meds', 'teas'].map((kitType) => (
                  <div key={kitType} className="flex items-center gap-3">
                    <KitIcon kitType={kitType} size="md" preferPng={false} />
                    <span className="text-gray-300 capitalize">{kitType}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Usage Examples */}
        <section>
          <h2 className="text-2xl font-semibold text-orange-300 mb-4">
            Integration Examples
          </h2>
          <div className="space-y-6 p-4 bg-gray-800 rounded-lg">
            
            {/* Form Labels */}
            <div>
              <h3 className="text-lg font-medium text-gray-200 mb-2">Form Labels</h3>
              <div className="grid grid-cols-2 gap-4">
                {['hazzy', 'bolty', 'meds', 'teas'].map((kitType) => (
                  <label key={kitType} className="flex items-center gap-2 text-sm text-gray-300">
                    <KitIcon kitType={kitType} size="sm" />
                    <span className="capitalize">{kitType}</span>
                    <input 
                      type="number" 
                      placeholder="0" 
                      className="ml-auto w-16 px-2 py-1 bg-gray-700 border border-orange-500 rounded text-white text-xs"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Task Indicators */}
            <div>
              <h3 className="text-lg font-medium text-gray-200 mb-2">Task Indicators</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2 bg-gray-700 rounded">
                  <KitIcon kitType="hazzy" size="sm" />
                  <span className="text-gray-300">Stock 5x Hazmat Suits at Base A1</span>
                  <span className="ml-auto text-xs text-green-400">Pending</span>
                </div>
                <div className="flex items-center gap-3 p-2 bg-gray-700 rounded">
                  <KitIcon kitType="bolty" size="sm" />
                  <span className="text-gray-300">Request 3x Bolt Action Rifles</span>
                  <span className="ml-auto text-xs text-yellow-400">In Progress</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}