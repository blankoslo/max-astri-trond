import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: 'Say hello in Norwegian'
      }]
    });

    const response = message.content[0];
    if (response.type !== 'text') {
      throw new Error('Unexpected response format');
    }

    return NextResponse.json({ 
      success: true, 
      message: response.text,
      model: 'claude-3-sonnet-20240229'
    });

  } catch (error) {
    console.error('Claude API test error:', error);
    return NextResponse.json({ 
      error: 'Claude API test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}